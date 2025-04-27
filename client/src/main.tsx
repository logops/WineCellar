import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add font imports
const fontLinks = document.createElement('div');
fontLinks.innerHTML = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap" rel="stylesheet">
`;
document.head.appendChild(fontLinks);

// Add title
const titleTag = document.createElement('title');
titleTag.textContent = 'Cellar | Modern Wine Collection Manager';
document.head.appendChild(titleTag);

createRoot(document.getElementById("root")!).render(<App />);
