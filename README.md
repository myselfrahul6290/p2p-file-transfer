# AirLink - Secure Peer-to-Peer File Sharing

> **Direct, Browser-to-Browser File Transfer via WebRTC**  
> Live at: [https://p2p.iamrahulshaw.in/](https://p2p.iamrahulshaw.in/)

AirLink is a high-performance, secure, serverless peer-to-peer (P2P) file sharing web application. It enables direct browser-to-browser transfers without cloud storage, file size limits, or intermediate tracking.

---

## 🚀 Key Highlights & Features

- **Direct WebRTC DataChannels**: True peer-to-peer transfer between browsers. No cloud file uploads or middleman storage.
- **End-to-End Encryption**: Data channels use DTLS and SRTP encryption natively provided by WebRTC standards.
- **No File Size Limits**: Files stream in chunked memory buffers, supporting gigabyte-sized files and folders.
- **Fast Desk Connection**: Quick 6-digit Desk ID (e.g. `482-910`) or instant QR code scan.
- **Bi-directional Encrypted Chat**: Send text messages and notes between connected devices during transfers.
---


## 🛠️ Tech Stack

- **Frontend**: React 18
- **Signaling Server**: Node.js, Express, WebSocket (`ws`)
- **P2P Transport**: WebRTC DataChannels 



## 👨‍💻 Author

Developed with care by **Rahul Shaw**  
Portfolio / Website: [https://iamrahulshaw.in/](https://iamrahulshaw.in/)
