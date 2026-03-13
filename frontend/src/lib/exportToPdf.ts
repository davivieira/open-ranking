import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Capture an HTML element and download it as a PDF.
 * @param element - The DOM element to capture (e.g. a div wrapping the leaderboard table)
 * @param filename - Suggested filename for the download (without .pdf)
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string = "export",
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#2A1743",
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgW = canvas.width;
  const imgH = canvas.height;
  const ratio = Math.min(pdfWidth / imgW, pdfHeight / imgH);
  const w = imgW * ratio;
  const h = imgH * ratio;
  const x = (pdfWidth - w) / 2;
  const y = (pdfHeight - h) / 2;
  pdf.addImage(imgData, "PNG", x, y, w, h);
  pdf.save(`${filename}.pdf`);
}
