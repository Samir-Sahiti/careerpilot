/**
 * Opens a new browser window with the given HTML content and triggers print dialog.
 * Users can save as PDF from the print dialog.
 */
export function exportToPdf(title: string, htmlContent: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #1a1a1a;
      padding: 2.5cm;
      max-width: 21cm;
      margin: 0 auto;
    }
    h1 { font-size: 16pt; font-weight: bold; margin-bottom: 8pt; }
    h2 { font-size: 13pt; font-weight: bold; margin: 16pt 0 6pt; }
    h3 { font-size: 11pt; font-weight: bold; margin: 12pt 0 4pt; }
    p { margin-bottom: 8pt; }
    .meta { color: #555; font-size: 10pt; margin-bottom: 16pt; }
    .divider { border-top: 1px solid #ccc; margin: 12pt 0; }
    .score { font-size: 14pt; font-weight: bold; color: #1a56db; }
    .label { font-weight: bold; }
    .feedback-block { margin-bottom: 20pt; padding-bottom: 12pt; border-bottom: 1px solid #eee; }
    @media print {
      body { padding: 0; }
      @page { margin: 2cm; }
    }
  </style>
</head>
<body>
  ${htmlContent}
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body>
</html>`);
  printWindow.document.close();
}
