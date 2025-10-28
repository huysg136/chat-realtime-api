# TODO: Fix 500 Error for 17MB Video Upload

- [x] Increase file size limit in multer configuration in server.js to handle larger files (e.g., 50MB)
- [ ] Test the upload route with a large file to ensure no 500 error
- [ ] Recommend using presigned URLs for direct uploads to R2 to avoid server-side processing for large files
- [ ] Update frontend to use presigned URLs for files over a certain size (e.g., 10MB)
