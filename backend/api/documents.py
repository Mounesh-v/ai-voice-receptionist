import pymupdf

from fastapi import APIRouter, File, HTTPException, UploadFile,Form
from langchain_text_splitters import RecursiveCharacterTextSplitter

from services.embeddings import generate_embeddings
from services.vector_store import store_chunks

router = APIRouter()

MAX_PDF_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/documents/extract")
async def extract_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file.",
        )

    pdf_bytes = await file.read()

    if not pdf_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(pdf_bytes) > MAX_PDF_SIZE:
        raise HTTPException(
            status_code=413,
            detail="The PDF must be 10 MB or smaller.",
        )

    try:
        with pymupdf.open(
            stream=pdf_bytes,
            filetype="pdf",
        ) as document:
            if document.is_encrypted:
                raise HTTPException(
                    status_code=400,
                    detail="Password-protected PDFs are not supported.",
                )

            pages = []

            for page_number, page in enumerate(document, start=1):
                text = page.get_text().strip()

                if text:
                    pages.append({
                        "page": page_number,
                        "text": text,
                    })

            if not pages:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        "No extractable text was found. "
                        "This PDF may require OCR."
                    ),
                )

            return {
                "filename": file.filename,
                "page_count": len(document),
                "extracted_pages": len(pages),
                "pages": pages,
            }

    except HTTPException:
        raise

    except Exception as error:
        print("PDF extraction error:", repr(error))

        raise HTTPException(
            status_code=400,
            detail="The PDF could not be read.",
        )
    finally:
        await file.close()
        
        

splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=120,
    separators=["\n\n", "\n", ". ", " ", ""],
)


@router.post("/documents/chunk")
async def chunk_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file.",
        )

    pdf_bytes = await file.read()

    if not pdf_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(pdf_bytes) > MAX_PDF_SIZE:
        raise HTTPException(
            status_code=413,
            detail="The PDF must be 10 MB or smaller.",
        )

    try:
        with pymupdf.open(
            stream=pdf_bytes,
            filetype="pdf",
        ) as document:
            if document.is_encrypted:
                raise HTTPException(
                    status_code=400,
                    detail="Password-protected PDFs are not supported.",
                )

            chunks = []

            for page_number, page in enumerate(document, start=1):
                page_text = page.get_text().strip()

                if not page_text:
                    continue

                page_chunks = splitter.split_text(page_text)

                for chunk_index, chunk_text in enumerate(page_chunks):
                    chunks.append({
                        "text": chunk_text,
                        "metadata": {
                            "filename": file.filename or "unknown.pdf",
                            "page": page_number,
                            "chunk_index": chunk_index,
                        },
                    })

            if not chunks:
                raise HTTPException(
                    status_code=422,
                    detail="No extractable text was found in the PDF.",
                )

            return {
                "filename": file.filename,
                "page_count": len(document),
                "chunk_count": len(chunks),
                "chunks": chunks,
            }

    except HTTPException:
        raise

    except Exception as error:
        print("PDF chunking error:", repr(error))

        raise HTTPException(
            status_code=400,
            detail="The PDF could not be processed.",
        )

    finally:
        await file.close()
        
        
@router.post("/documents/index")
async def index_pdf(
    business_id: str = Form(...),
    file: UploadFile = File(...),
):
    if not business_id.strip():
        raise HTTPException(
            status_code=400,
            detail="business_id is required.",
        )

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Please upload a PDF file.",
        )

    pdf_bytes = await file.read()

    if not pdf_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(pdf_bytes) > MAX_PDF_SIZE:
        raise HTTPException(
            status_code=413,
            detail="The PDF must be 10 MB or smaller.",
        )

    try:
        with pymupdf.open(
            stream=pdf_bytes,
            filetype="pdf",
        ) as document:
            if document.is_encrypted:
                raise HTTPException(
                    status_code=400,
                    detail="Password-protected PDFs are not supported.",
                )

            chunks = []

            for page_number, page in enumerate(document, start=1):
                page_text = page.get_text().strip()

                if not page_text:
                    continue

                for chunk_index, text in enumerate(
                    splitter.split_text(page_text)
                ):
                    chunks.append({
                        "text": text,
                        "metadata": {
                            "filename": file.filename or "unknown.pdf",
                            "page": page_number,
                            "chunk_index": chunk_index,
                        },
                    })

        if not chunks:
            raise HTTPException(
                status_code=422,
                detail="No extractable text was found in the PDF.",
            )

        embeddings = generate_embeddings(
            [chunk["text"] for chunk in chunks]
        )

        stored_count = store_chunks(
            chunks=chunks,
            embeddings=embeddings,
            business_id=business_id.strip(),
        )

        return {
            "message": "PDF indexed successfully.",
            "filename": file.filename,
            "business_id": business_id.strip(),
            "chunk_count": len(chunks),
            "stored_count": stored_count,
        }

    except HTTPException:
        raise

    except Exception as error:
        print("PDF indexing error:", repr(error))

        raise HTTPException(
            status_code=500,
            detail="The PDF could not be indexed.",
        )

    finally:
        await file.close()