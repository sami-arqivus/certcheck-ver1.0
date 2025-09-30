"""
Enhanced file validation for uploads
Validates file type, size, and content to prevent malicious uploads
"""
import os
import io
import magic
from PIL import Image
from fastapi import HTTPException, UploadFile
from typing import List, Set
import logging

logger = logging.getLogger(__name__)

class FileValidator:
    def __init__(self):
        # Allowed file extensions
        self.allowed_extensions: Set[str] = {'.jpg', '.jpeg', '.png', '.pdf', '.json'}
        
        # Allowed MIME types
        self.allowed_mime_types: Set[str] = {
            'image/jpeg',
            'image/png', 
            'application/pdf',
            'application/json'
        }
        
        # Maximum file sizes (in bytes)
        self.max_file_sizes = {
            'image': 10 * 1024 * 1024,  # 10MB for images
            'pdf': 50 * 1024 * 1024,    # 50MB for PDFs
            'json': 1 * 1024 * 1024,    # 1MB for JSON files
            'default': 5 * 1024 * 1024  # 5MB default
        }
        
        # Maximum image dimensions
        self.max_image_dimensions = (8000, 8000)  # 8K resolution max
    
    def get_file_extension(self, filename: str) -> str:
        """Extract file extension from filename"""
        if not filename:
            return ""
        return os.path.splitext(filename)[1].lower()
    
    def get_file_type_from_extension(self, extension: str) -> str:
        """Determine file type from extension"""
        if extension in {'.jpg', '.jpeg', '.png'}:
            return 'image'
        elif extension == '.pdf':
            return 'pdf'
        elif extension == '.json':
            return 'json'
        else:
            return 'default'
    
    def validate_filename(self, filename: str) -> bool:
        """Validate filename for security"""
        if not filename:
            return False
        
        # Check for dangerous characters
        dangerous_chars = {'..', '/', '\\', ':', '*', '?', '"', '<', '>', '|'}
        for char in dangerous_chars:
            if char in filename:
                logger.warning(f"Dangerous character '{char}' found in filename: {filename}")
                return False
        
        # Check filename length
        if len(filename) > 255:
            logger.warning(f"Filename too long: {filename}")
            return False
        
        return True
    
    def validate_file_extension(self, filename: str) -> bool:
        """Validate file extension"""
        extension = self.get_file_extension(filename)
        return extension in self.allowed_extensions
    
    def validate_file_size(self, file_content: bytes, filename: str) -> bool:
        """Validate file size based on file type"""
        file_size = len(file_content)
        extension = self.get_file_extension(filename)
        file_type = self.get_file_type_from_extension(extension)
        
        max_size = self.max_file_sizes.get(file_type, self.max_file_sizes['default'])
        
        if file_size > max_size:
            logger.warning(f"File too large: {file_size} bytes, max allowed: {max_size} bytes")
            return False
        
        return True
    
    def validate_mime_type(self, file_content: bytes) -> bool:
        """Validate MIME type using python-magic"""
        try:
            mime_type = magic.from_buffer(file_content, mime=True)
            return mime_type in self.allowed_mime_types
        except Exception as e:
            logger.error(f"Error validating MIME type: {e}")
            return False
    
    def validate_image_content(self, file_content: bytes) -> bool:
        """Validate image content using PIL"""
        try:
            with Image.open(io.BytesIO(file_content)) as img:
                # Verify the image can be opened
                img.verify()
                
                # Check image dimensions
                img_copy = Image.open(io.BytesIO(file_content))
                width, height = img_copy.size
                
                if width > self.max_image_dimensions[0] or height > self.max_image_dimensions[1]:
                    logger.warning(f"Image dimensions too large: {width}x{height}")
                    return False
                
                # Check for suspicious patterns (basic check)
                if width == 0 or height == 0:
                    logger.warning("Invalid image dimensions")
                    return False
                
                return True
        except Exception as e:
            logger.error(f"Error validating image content: {e}")
            return False
    
    def validate_pdf_content(self, file_content: bytes) -> bool:
        """Basic PDF validation"""
        try:
            # Check PDF header
            if not file_content.startswith(b'%PDF-'):
                logger.warning("Invalid PDF header")
                return False
            
            # Check for suspicious patterns (basic check)
            suspicious_patterns = [b'<script', b'javascript:', b'vbscript:']
            for pattern in suspicious_patterns:
                if pattern in file_content.lower():
                    logger.warning(f"Suspicious pattern found in PDF: {pattern}")
                    return False
            
            return True
        except Exception as e:
            logger.error(f"Error validating PDF content: {e}")
            return False
    
    def validate_json_content(self, file_content: bytes) -> bool:
        """Validate JSON content"""
        try:
            import json
            json.loads(file_content.decode('utf-8'))
            return True
        except Exception as e:
            logger.error(f"Error validating JSON content: {e}")
            return False
    
    async def validate_upload_file(self, file: UploadFile) -> bool:
        """
        Comprehensive file validation
        
        Args:
            file: FastAPI UploadFile object
            
        Returns:
            bool: True if file is valid, False otherwise
            
        Raises:
            HTTPException: If file validation fails
        """
        try:
            # Read file content
            file_content = await file.read()
            
            # Reset file pointer for potential reuse
            await file.seek(0)
            
            # Validate filename
            if not self.validate_filename(file.filename):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid filename. Filename contains dangerous characters or is too long."
                )
            
            # Validate file extension
            if not self.validate_file_extension(file.filename):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file extension. Allowed extensions: {', '.join(self.allowed_extensions)}"
                )
            
            # Validate file size
            if not self.validate_file_size(file_content, file.filename):
                file_type = self.get_file_type_from_extension(self.get_file_extension(file.filename))
                max_size = self.max_file_sizes.get(file_type, self.max_file_sizes['default'])
                raise HTTPException(
                    status_code=400,
                    detail=f"File too large. Maximum size allowed: {max_size // (1024*1024)}MB"
                )
            
            # Validate MIME type
            if not self.validate_mime_type(file_content):
                raise HTTPException(
                    status_code=400,
                    detail="Invalid file type. File content does not match expected format."
                )
            
            # Validate content based on file type
            extension = self.get_file_extension(file.filename)
            file_type = self.get_file_type_from_extension(extension)
            
            if file_type == 'image':
                if not self.validate_image_content(file_content):
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid image file. Image may be corrupted or have invalid dimensions."
                    )
            elif file_type == 'pdf':
                if not self.validate_pdf_content(file_content):
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid PDF file. File may be corrupted or contain suspicious content."
                    )
            elif file_type == 'json':
                if not self.validate_json_content(file_content):
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid JSON file. File contains malformed JSON."
                    )
            
            logger.info(f"File validation successful for: {file.filename}")
            return True
            
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            logger.error(f"Unexpected error during file validation: {e}")
            raise HTTPException(
                status_code=500,
                detail="File validation failed due to an internal error."
            )

# Global file validator instance
file_validator = FileValidator()

# Convenience function for easy use
async def validate_upload_file(file: UploadFile) -> bool:
    """Validate an uploaded file using the global file validator"""
    return await file_validator.validate_upload_file(file)
