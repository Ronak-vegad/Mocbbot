import base64
import io
import os
import uuid
from pathlib import Path
from typing import Dict, Any

# File storage directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# In-memory file registry: file_id -> metadata + content
_file_store: Dict[str, Dict[str, Any]] = {}


def get_file(file_id: str) -> Dict[str, Any]:
    return _file_store.get(file_id)


async def process_file(file_bytes: bytes, filename: str, content_type: str) -> Dict[str, Any]:
    """Parse uploaded file based on type, return structured content."""
    file_id = str(uuid.uuid4())
    ext = Path(filename).suffix.lower()

    # Save raw file to disk
    save_path = UPLOAD_DIR / f"{file_id}{ext}"
    with open(save_path, "wb") as f:
        f.write(file_bytes)

    result = {
        "file_id": file_id,
        "filename": filename,
        "file_path": str(save_path),
        "file_type": _detect_type(ext, content_type),
        "content": "",
        "base64": None,
    }

    try:
        if result["file_type"] == "pdf":
            result["content"] = _parse_pdf(file_bytes)

        elif result["file_type"] == "docx":
            result["content"] = _parse_docx(file_bytes)

        elif result["file_type"] in ("csv", "excel"):
            result["content"] = _parse_spreadsheet(file_bytes, ext)

        elif result["file_type"] == "image":
            result["base64"] = base64.b64encode(file_bytes).decode("utf-8")
            result["content"] = f"[Image file: {filename}]"

        elif result["file_type"] == "text":
            result["content"] = file_bytes.decode("utf-8", errors="replace")

    except Exception as e:
        result["content"] = f"[Error parsing file: {str(e)}]"

    _file_store[file_id] = result
    return result


def _detect_type(ext: str, content_type: str) -> str:
    if ext == ".pdf":
        return "pdf"
    elif ext == ".docx":
        return "docx"
    elif ext in (".csv",):
        return "csv"
    elif ext in (".xlsx", ".xls"):
        return "excel"
    elif ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        return "image"
    elif ext in (".txt", ".md"):
        return "text"
    elif "image" in content_type:
        return "image"
    elif "pdf" in content_type:
        return "pdf"
    return "text"


def _parse_pdf(file_bytes: bytes) -> str:
    import fitz  # PyMuPDF
    text_parts = []
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    for page in doc:
        text_parts.append(page.get_text())
    doc.close()
    return "\n".join(text_parts).strip()


def _parse_docx(file_bytes: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def _parse_spreadsheet(file_bytes: bytes, ext: str) -> str:
    import pandas as pd
    if ext == ".csv":
        df = pd.read_csv(io.BytesIO(file_bytes))
    else:
        df = pd.read_excel(io.BytesIO(file_bytes))

    summary = f"Shape: {df.shape[0]} rows × {df.shape[1]} columns\n"
    summary += f"Columns: {', '.join(df.columns.astype(str).tolist())}\n\n"
    summary += df.head(20).to_string(index=False)
    return summary
