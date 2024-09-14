# Notespot

A **full-stack file sharing platform** designed for users to upload, download, and publicly share files of various formats (PDFs, docs, images, etc.), built with a focus on **scalable cloud infrastructure** and **modern backend development practices**.

### **Architecture Overview**
<img width="650" alt="image" src="https://github.com/user-attachments/assets/27b2965d-9aa3-43f1-9bde-da6ad5d84485">

- **Frontend**: Built with **Next.js**, deployed on **Vercel**, delivering a easy to use interface for users.
- **Backend**: Developed using **Express.js** and deployed on an **AWS EC2 instance**, providing a highly reliable **REST API** to facilitate communication between the frontend and backend services.
- **Authentication**: Integrated **Clerk** for user authentication and API security, ensuring only authorized users can access and manipulate data.
- **File Storage**: Files are uploaded to **AWS S3**, leveraging the scalability and performance of Amazon’s cloud storage.
- **Database**: Metadata and related information is stored in **MongoDB Atlas**, enabling efficient data management and fast querying.

### Key Features
- **File Management**: Upload, download, and share files (PDFs, docs, images) through a user-friendly interface.
- **Authentication**: Secure login and user authentication powered by **Clerk** for seamless and safe user experiences.
- **Scalable Cloud Storage**: Uploaded files are stored securely on **AWS S3**, ensuring high availability and durability.
- **Metadata Management**: File metadata (e.g., file name, size, upload date) stored in **MongoDB Atlas** for efficient querying and data management.
- **RESTful API**: Built using **Express.js**, offering a robust backend that supports **CRUD operations** for managing files and user data.

### **How It Works**

1. **Upload**: Users log in using Clerk and upload files via the Next.js frontend.
2. **Storage**: Files are uploaded to **AWS S3**, ensuring they are stored securely and efficiently in the cloud.
3. **Metadata**: File details (name, size, user info) are stored in **MongoDB Atlas**, making it easy to track and query file data.
4. **Access**: Files can be accessed and downloaded publicly. Users can manage their uploaded files (edit/delete).
