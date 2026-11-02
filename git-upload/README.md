# NEUROPATH — Phân đoạn ảnh MRI não 2D

Ứng dụng web chạy trên máy cá nhân, dùng mô hình YOLO để phân đoạn vùng nghi ngờ trên ảnh MRI. Phần web được chạy bằng Python; bạn mở giao diện trong trình duyệt.

**Chỉ dành cho học tập và nghiên cứu.** Kết quả không phải kết luận chẩn đoán và không thay thế đánh giá của bác sĩ.

## 1. Chuẩn bị

- Máy Windows hoặc Linux 64-bit, kết nối Internet khi tải và cài thư viện.
- Python 3.11 hoặc 3.12, tải từ [python.org](https://www.python.org/downloads/). Trên Windows, khi cài nhớ chọn **Add Python to PATH**.
- Vài GB dung lượng trống cho môi trường và thư viện. Không cần GPU; hướng dẫn dưới đây cài PyTorch bản CPU.

Trên GitHub, bấm **Code → Download ZIP**, giải nén tệp ZIP. Mở thư mục vừa giải nén chứa `app.py`, `requirements.txt`, `prepare_model.py` và `static/`. Toàn bộ các lệnh bên dưới phải chạy trong thư mục này; không chạy bên trong tệp ZIP.

Mô hình được chia thành ba tệp `yolo.pt.part00`, `yolo.pt.part01`, `yolo.pt.part02` để tải được lên GitHub bằng trình duyệt. Cần tải đủ cả ba tệp trước khi tiếp tục.

## 2A. Cài đặt và chạy trên Windows

Mở thư mục dự án trong File Explorer. Bấm thanh địa chỉ, gõ `powershell` rồi nhấn Enter để mở PowerShell tại đúng thư mục. Chạy từng lệnh:

```powershell
py -3.11 --version
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r requirements.txt
python prepare_model.py
python app.py
```

Nếu bạn cài Python 3.12 thay vì 3.11, thay `py -3.11` bằng `py -3.12` ở hai lệnh đầu. Quá trình tải thư viện có thể mất nhiều thời gian. Đợi đến khi dòng lệnh báo `NEUROPATH · http://127.0.0.1:8000`, sau đó mở địa chỉ [http://127.0.0.1:8000](http://127.0.0.1:8000) trong trình duyệt.

Nếu PowerShell chặn `Activate.ps1`, không cần thay đổi chính sách máy. Có thể chạy các lệnh sau **sau khi đã tạo `.venv`**; cách này gọi Python trong môi trường ảo trực tiếp:

```powershell
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe prepare_model.py
.\.venv\Scripts\python.exe app.py
```

## 2B. Cài đặt và chạy trên Linux

Mở Terminal tại thư mục dự án. Ví dụ, nếu thư mục đã giải nén nằm trong Downloads và tên là `mri-main`:

```bash
cd ~/Downloads/mri-main
```

Thay đường dẫn trên bằng đường dẫn thực tế nếu khác. Kiểm tra Python rồi tạo môi trường ảo và cài thư viện:

```bash
python3 --version
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
python -m pip install -r requirements.txt
python prepare_model.py
python app.py
```

Dùng Python 3.11 hoặc 3.12 cho các bước trên. Nếu `python3` là phiên bản khác, cài phiên bản phù hợp và dùng lệnh tương ứng, ví dụ `python3.11 -m venv .venv`. Trên Ubuntu/Debian, nếu báo thiếu `venv`, hãy cài gói `python3-venv` tương ứng phiên bản Python rồi tạo lại môi trường. Khi chương trình báo `NEUROPATH · http://127.0.0.1:8000`, mở [http://127.0.0.1:8000](http://127.0.0.1:8000) trong trình duyệt.

## 3. Sử dụng và chạy lại

1. Chọn hoặc kéo một ảnh MRI định dạng PNG, JPEG, WEBP hoặc BMP vào giao diện; ảnh tối đa 10 MB và 16 triệu pixel.
2. Bấm **Phân tích ảnh**. Lần đầu có thể chậm vì ứng dụng cần tải mô hình vào bộ nhớ.
3. Xem ảnh gốc, ảnh phân đoạn hoặc mặt nạ. Bạn có thể tải kết quả xuống.
4. Để dừng web, quay lại cửa sổ terminal và nhấn `Ctrl+C`.

Các lần sau không cần cài lại thư viện hoặc ghép lại mô hình. Mở terminal trong thư mục dự án, sau đó chạy:

**Windows PowerShell:**

```powershell
.\.venv\Scripts\python.exe app.py
```

**Linux:**

```bash
.venv/bin/python app.py
```

Mở lại [http://127.0.0.1:8000](http://127.0.0.1:8000). Bộ tải lên này không chứa bộ dữ liệu test, vì vậy mục **Thử với tập test** sẽ trống; bạn có thể chọn ảnh từ máy.

## 4. Xử lý lỗi thường gặp

- **Không tìm thấy `python`, `py` hoặc sai phiên bản:** cài Python 3.11/3.12, đóng và mở lại terminal; kiểm tra `py -0p` trên Windows hoặc `python3 --version` trên Linux.
- **Không tạo được môi trường ảo trên Linux:** cài gói hỗ trợ `venv` của bản phân phối cho phiên bản Python đang dùng, rồi chạy lại lệnh tạo `.venv`.
- **Không cài được thư viện:** kiểm tra mạng và chạy lại các lệnh `pip` trong môi trường ảo. Trên Linux, lỗi `libGL.so.1` có thể cần cài thư viện hệ thống OpenGL phù hợp với bản phân phối.
- **Thiếu hoặc sai mô hình:** kiểm tra đủ ba tệp `yolo.pt.part00`, `yolo.pt.part01`, `yolo.pt.part02` ở cùng thư mục với `prepare_model.py`, sau đó chạy lại `python prepare_model.py` trong môi trường ảo. Script kiểm tra SHA-256 trước khi tạo `yolo.pt`.
- **Cổng 8000 đang được dùng:** đóng ứng dụng đang chiếm cổng, hoặc đặt `PORT=8080` trước khi chạy. Trên Windows PowerShell chạy `$env:PORT = '8080'`; trên Linux chạy `export PORT=8080`, rồi khởi động lại và mở `http://127.0.0.1:8080`.

Ứng dụng chỉ lắng nghe tại `127.0.0.1` trên máy của bạn. Ảnh tải lên và kết quả xử lý được giữ trong bộ nhớ; ứng dụng không chủ động lưu chúng vào ổ đĩa. Chỉ sử dụng checkpoint mô hình từ nguồn tin cậy.
