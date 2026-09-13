import os
import shutil
import yaml
from pathlib import Path

BASE_DIR = Path("/home/gandhaar/project/ramoji/datasets")
DATASET_A = BASE_DIR / "IndianFoodNet-1"
DATASET_B = BASE_DIR / "Indian_food-2"
MERGED_DIR = BASE_DIR / "merged_indian_food"

# Canonical mapping for name harmonization
SYNONYMS = {
    "besan_cheela": "BesanCheela",
    "dosa": "Dosa",
    "gulab_jamun": "GulabJamun",
    "idli": "Idli",
    "palak_paneer": "PalakPaneer",
    "poha": "Poha",
    "samosa": "Samosa",
}

def load_classes(yaml_path):
    with open(yaml_path, 'r') as f:
        data = yaml.safe_load(f)
    return data['names']

def normalize_name(name):
    clean = name.strip()
    return SYNONYMS.get(clean, clean)

def main():
    print("Loading dataset metadata...")
    names_a = load_classes(DATASET_A / "data.yaml")
    names_b = load_classes(DATASET_B / "data.yaml")

    # Build canonical master class list
    master_classes = []
    for n in names_a:
        norm = normalize_name(n)
        if norm not in master_classes:
            master_classes.append(norm)

    for n in names_b:
        norm = normalize_name(n)
        if norm not in master_classes:
            master_classes.append(norm)

    master_classes.sort()
    class_to_id = {c: i for i, c in enumerate(master_classes)}

    print(f"Master classes ({len(master_classes)}): {master_classes}")

    # Create directory structure
    for split in ["train", "valid", "test"]:
        (MERGED_DIR / split / "images").mkdir(parents=True, exist_ok=True)
        (MERGED_DIR / split / "labels").mkdir(parents=True, exist_ok=True)

    # Function to process dataset
    def process_dataset(ds_path, ds_prefix, ds_names):
        id_remap = {}
        for old_id, name in enumerate(ds_names):
            norm = normalize_name(name)
            id_remap[old_id] = class_to_id[norm]

        for split in ["train", "valid", "test"]:
            img_dir = ds_path / split / "images"
            lbl_dir = ds_path / split / "labels"
            if not img_dir.exists():
                continue

            target_img_dir = MERGED_DIR / split / "images"
            target_lbl_dir = MERGED_DIR / split / "labels"

            for img_file in img_dir.glob("*.*"):
                stem = img_file.stem
                suffix = img_file.suffix
                new_stem = f"{ds_prefix}_{stem}"
                
                # Copy/symlink image
                target_img = target_img_dir / f"{new_stem}{suffix}"
                if not target_img.exists():
                    os.link(img_file, target_img)

                # Process matching label
                lbl_file = lbl_dir / f"{stem}.txt"
                if lbl_file.exists():
                    target_lbl = target_lbl_dir / f"{new_stem}.txt"
                    with open(lbl_file, "r") as f_in, open(target_lbl, "w") as f_out:
                        for line in f_in:
                            parts = line.strip().split()
                            if len(parts) >= 5:
                                try:
                                    old_cls = int(parts[0])
                                    new_cls = id_remap[old_cls]
                                    f_out.write(f"{new_cls} " + " ".join(parts[1:]) + "\n")
                                except (ValueError, KeyError):
                                    continue

    print("Merging IndianFoodNet-1...")
    process_dataset(DATASET_A, "ifn", names_a)

    print("Merging Indian_food-2...")
    process_dataset(DATASET_B, "if2", names_b)

    # Write merged data.yaml
    data_yaml = {
        "path": str(MERGED_DIR),
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images",
        "nc": len(master_classes),
        "names": master_classes
    }

    with open(MERGED_DIR / "data.yaml", "w") as f:
        yaml.dump(data_yaml, f, sort_keys=False)

    train_count = len(list((MERGED_DIR / "train" / "images").glob("*.*")))
    val_count = len(list((MERGED_DIR / "valid" / "images").glob("*.*")))
    test_count = len(list((MERGED_DIR / "test" / "images").glob("*.*")))
    total = train_count + val_count + test_count

    print(f"\nMerge Complete!")
    print(f"Total Images: {total} (Train: {train_count}, Val: {val_count}, Test: {test_count})")
    print(f"Master Classes ({len(master_classes)}):")
    for i, c in enumerate(master_classes):
        print(f"  {i}: {c}")
    print(f"Generated YAML: {MERGED_DIR / 'data.yaml'}")

if __name__ == "__main__":
    main()
