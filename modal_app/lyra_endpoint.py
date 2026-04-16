"""
EventPulse — Lyra 2.0 GPU Worker (Modal)

Runs Lyra 2.0 3D scene generation on Modal's A100 GPUs.
Accepts a venue photo, returns a .ply point cloud.

Prerequisites:
  - Modal account with GPU access
  - HuggingFace token with access to nvidia/Lyra
  - Run: modal deploy modal_app/lyra_endpoint.py
"""

import modal
import time

# ── Modal Image ──
lyra_image = (
    modal.Image.from_registry("nvcr.io/nvidia/pytorch:23.10-py3")
    .apt_install("git")
    .run_commands(
        "git clone https://github.com/nv-tlabs/lyra /opt/lyra",
        "cd /opt/lyra && pip install -e .",
    )
    .pip_install("huggingface_hub")
)

vol = modal.Volume.from_name("lyra-weights", create_if_missing=True)
app = modal.App("eventpulse-lyra")

WEIGHTS_DIR = "/weights/lyra"


def download_weights():
    """Download Lyra model weights from HuggingFace if not cached."""
    import os
    from huggingface_hub import snapshot_download

    if os.path.exists(os.path.join(WEIGHTS_DIR, "config.json")):
        print("Weights already cached.")
        return

    print("Downloading Lyra weights from HuggingFace...")
    snapshot_download(
        repo_id="nvidia/Lyra",
        local_dir=WEIGHTS_DIR,
        token=os.environ.get("HF_TOKEN"),
    )
    print("Weights downloaded successfully.")


@app.function(
    image=lyra_image,
    gpu="A100",
    timeout=600,
    secrets=[modal.Secret.from_name("huggingface")],
    volumes={"/weights": vol},
    memory=32768,
)
def run_lyra(image_bytes: bytes, filename: str) -> dict:
    """
    Run Lyra 2.0 inference on a venue photo.

    Args:
        image_bytes: Raw bytes of the input image
        filename: Original filename for logging

    Returns:
        dict with ply_bytes, point_count, and elapsed time
    """
    import os
    import subprocess
    import glob as globmod

    start = time.time()

    # Ensure weights are downloaded
    download_weights()
    vol.commit()

    # Write input image
    input_path = "/tmp/venue_input.jpg"
    with open(input_path, "wb") as f:
        f.write(image_bytes)

    if not os.path.exists(input_path):
        raise RuntimeError(f"Failed to write input image to {input_path}")

    print(f"Processing venue photo: {filename} ({len(image_bytes)} bytes)")

    # Build torchrun command using Lyra's inference script
    # The exact script path is based on the Lyra repo structure
    output_dir = "/tmp/lyra_output"
    os.makedirs(output_dir, exist_ok=True)

    # Lyra uses cosmos_predict1 diffusion inference
    inference_script = "/opt/lyra/cosmos_predict1/diffusion/inference/inference.py"

    # Fall back to searching for the script if not at expected path
    if not os.path.exists(inference_script):
        candidates = globmod.glob("/opt/lyra/**/inference*.py", recursive=True)
        if not candidates:
            raise RuntimeError(
                "Could not find Lyra inference script. "
                f"Searched /opt/lyra/ — found files: {os.listdir('/opt/lyra/')}"
            )
        inference_script = candidates[0]
        print(f"Using inference script: {inference_script}")

    cmd = [
        "torchrun",
        "--nproc_per_node=1",
        inference_script,
        "--input_image", input_path,
        "--output_dir", output_dir,
        "--checkpoint_dir", WEIGHTS_DIR,
    ]

    print(f"Running: {' '.join(cmd)}")

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=500,
        cwd="/opt/lyra",
    )

    if result.returncode != 0:
        raise RuntimeError(
            f"Lyra inference failed (exit {result.returncode}).\n"
            f"STDOUT: {result.stdout[-2000:]}\n"
            f"STDERR: {result.stderr[-2000:]}"
        )

    # Find output PLY
    ply_files = globmod.glob(os.path.join(output_dir, "**/*.ply"), recursive=True)
    if not ply_files:
        raise RuntimeError(
            f"No .ply output found in {output_dir}. "
            f"Contents: {os.listdir(output_dir)}"
        )

    ply_path = ply_files[0]
    with open(ply_path, "rb") as f:
        ply_bytes = f.read()

    # Count points (rough estimate from file header)
    point_count = 0
    with open(ply_path, "r", errors="ignore") as f:
        for line in f:
            if line.startswith("element vertex"):
                point_count = int(line.split()[-1])
                break

    elapsed = round(time.time() - start, 2)
    print(f"Done: {point_count} points in {elapsed}s")

    return {
        "ply_bytes": ply_bytes,
        "point_count": point_count,
        "elapsed": elapsed,
    }
