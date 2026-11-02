"""Reassemble the model split into browser-uploadable files and verify its hash."""
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
EXPECTED = "701f1d5b2ef92a1df9674152d55ae95b8f25f8a2d78b90feb34e4d6d290f9308"
PARTS = [ROOT / f"yolo.pt.part{index:02}" for index in range(3)]
MODEL = ROOT / "yolo.pt"
TEMP = ROOT / "yolo.pt.tmp"


def main():
    missing = [part.name for part in PARTS if not part.is_file()]
    if missing:
        raise SystemExit("Thiếu tệp mô hình: " + ", ".join(missing))

    digest = hashlib.sha256()
    try:
        with TEMP.open("wb") as output:
            for part in PARTS:
                with part.open("rb") as source:
                    for block in iter(lambda: source.read(1024 * 1024), b""):
                        output.write(block)
                        digest.update(block)
        if digest.hexdigest() != EXPECTED:
            raise SystemExit("Các phần mô hình không khớp. Hãy tải lại đầy đủ từ GitHub.")
        TEMP.replace(MODEL)
    finally:
        TEMP.unlink(missing_ok=True)
    print(f"Đã tạo và kiểm tra mô hình: {MODEL}")


if __name__ == "__main__":
    main()
