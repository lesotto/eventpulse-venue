"""
Generate a synthetic golf course point cloud as the fallback .ply file.
This allows the demo to work without GPU / Modal access.

Usage: python scripts/generate_fallback_ply.py
"""

import os
import struct

import numpy as np

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'sample_scenes', 'concession_fallback.ply')
TARGET_POINTS = 50000


def generate_points():
    """Generate ~50k points representing a golf course venue."""
    all_points = []
    all_colors = []

    rng = np.random.default_rng(42)

    # ── 1. Terrain plane (fairway, rough, green) — ~25k points ──
    n_terrain = 25000
    x = rng.uniform(-150, 150, n_terrain)
    z = rng.uniform(-120, 120, n_terrain)
    y = (
        np.sin(x * 0.02) * 3
        + np.sin(z * 0.015) * 2
        + np.sin(x * 0.05 + z * 0.03) * 1.5
        + rng.normal(0, 0.3, n_terrain)
    )
    # Depression for putting green
    dist = np.sqrt(x**2 + z**2)
    mask_green = dist < 20
    y[mask_green] -= 1.5 * (1 - dist[mask_green] / 20)

    colors_terrain = np.zeros((n_terrain, 3), dtype=np.uint8)
    # Rough (dark green)
    colors_terrain[:, 0] = 30
    colors_terrain[:, 1] = 76
    colors_terrain[:, 2] = 25
    # Fairway (medium green)
    mask_fairway = (dist > 20) & (dist < 60)
    colors_terrain[mask_fairway] = [56, 122, 46]
    # Putting green (bright green)
    colors_terrain[mask_green] = [46, 140, 51]

    all_points.append(np.column_stack([x, y, z]))
    all_colors.append(colors_terrain)

    # ── 2. Tree clusters at edges — ~10k points ──
    n_trees = 10000
    # Trees along the boundary
    angles = rng.uniform(0, 2 * np.pi, n_trees)
    radii = rng.uniform(70, 140, n_trees)
    tx = np.cos(angles) * radii
    tz = np.sin(angles) * radii
    ty = rng.uniform(0, 12, n_trees)  # height spread for canopy
    # Trunk vs canopy
    trunk_mask = ty < 3
    tree_colors = np.zeros((n_trees, 3), dtype=np.uint8)
    tree_colors[:, 0] = 20 + rng.integers(0, 15, n_trees).astype(np.uint8)
    tree_colors[:, 1] = 80 + rng.integers(0, 30, n_trees).astype(np.uint8)
    tree_colors[:, 2] = 15 + rng.integers(0, 10, n_trees).astype(np.uint8)
    tree_colors[trunk_mask, 0] = 74
    tree_colors[trunk_mask, 1] = 46
    tree_colors[trunk_mask, 2] = 10

    all_points.append(np.column_stack([tx, ty, tz]))
    all_colors.append(tree_colors)

    # ── 3. Sand traps — ~3k points ──
    n_sand = 3000
    # Two sand trap locations
    for cx, cz, rx, rz in [(30, -20, 12, 8), (-25, 15, 10, 7)]:
        n = n_sand // 2
        sx = rng.normal(cx, rx / 3, n)
        sz = rng.normal(cz, rz / 3, n)
        sy = rng.uniform(-0.5, 0.2, n)
        sand_colors = np.zeros((n, 3), dtype=np.uint8)
        sand_colors[:, 0] = 194 + rng.integers(0, 10, n).astype(np.uint8)
        sand_colors[:, 1] = 176 + rng.integers(0, 10, n).astype(np.uint8)
        sand_colors[:, 2] = 128 + rng.integers(0, 10, n).astype(np.uint8)
        all_points.append(np.column_stack([sx, sy, sz]))
        all_colors.append(sand_colors)

    # ── 4. Water hazard — ~4k points ──
    n_water = 4000
    wx = rng.uniform(-72, -28, n_water)
    wz = rng.uniform(20, 40, n_water)
    wy = np.full(n_water, -0.5) + rng.normal(0, 0.05, n_water)
    water_colors = np.zeros((n_water, 3), dtype=np.uint8)
    water_colors[:, 0] = 26 + rng.integers(0, 10, n_water).astype(np.uint8)
    water_colors[:, 1] = 74 + rng.integers(0, 15, n_water).astype(np.uint8)
    water_colors[:, 2] = 106 + rng.integers(0, 15, n_water).astype(np.uint8)
    all_points.append(np.column_stack([wx, wy, wz]))
    all_colors.append(water_colors)

    # ── 5. Clubhouse footprint — ~5k points ──
    n_club = 5000
    # Box-shaped building
    cx = rng.uniform(-15, 15, n_club)
    cy = rng.uniform(0, 8, n_club)
    cz = rng.uniform(-107, -93, n_club)
    club_colors = np.zeros((n_club, 3), dtype=np.uint8)
    # Walls (light beige)
    club_colors[:, 0] = 232
    club_colors[:, 1] = 224
    club_colors[:, 2] = 204
    # Roof (dark brown for top points)
    roof_mask = cy > 7
    club_colors[roof_mask] = [58, 42, 26]
    all_points.append(np.column_stack([cx, cy, cz]))
    all_colors.append(club_colors)

    # ── 6. Cart paths — ~3k points ──
    n_path = 3000
    t = np.linspace(0, 1, n_path)
    px = -5 + t * 15 + np.sin(t * 3) * 10
    pz = -95 + t * 165
    py = np.full(n_path, 0.1) + rng.normal(0, 0.02, n_path)
    path_colors = np.full((n_path, 3), 170, dtype=np.uint8)
    all_points.append(np.column_stack([px, py, pz]))
    all_colors.append(path_colors)

    # Combine all
    points = np.vstack(all_points).astype(np.float32)
    colors = np.vstack(all_colors).astype(np.uint8)

    return points, colors


def write_ply(filepath, points, colors):
    """Write a binary PLY file with vertex positions and colors."""
    n = len(points)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    header = (
        "ply\n"
        "format binary_little_endian 1.0\n"
        f"element vertex {n}\n"
        "property float x\n"
        "property float y\n"
        "property float z\n"
        "property uchar red\n"
        "property uchar green\n"
        "property uchar blue\n"
        "end_header\n"
    )

    with open(filepath, 'wb') as f:
        f.write(header.encode('ascii'))
        for i in range(n):
            f.write(struct.pack('<fff', points[i, 0], points[i, 1], points[i, 2]))
            f.write(struct.pack('<BBB', colors[i, 0], colors[i, 1], colors[i, 2]))

    print(f"Generated fallback PLY: {n} points -> {filepath}")
    print(f"File size: {os.path.getsize(filepath) / 1024:.0f} KB")


if __name__ == '__main__':
    points, colors = generate_points()
    write_ply(OUTPUT_PATH, points, colors)
