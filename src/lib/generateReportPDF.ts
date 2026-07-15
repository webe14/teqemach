import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface GroupedContributor {
  contributorName: string;
  phone: string;
  dates: string[];
  totalDays: number;
  totalAmount: number;
  groupName: string;
  cycles: string;
}

export interface ReportSummary {
  totalContributors: number;
  totalContributionDays: number;
  totalAmount: number;
  averagePerContributor: number;
  numberOfGroups: number;
  numberOfCycles: number;
}

export interface ReportPDFOptions {
  contributors: GroupedContributor[];
  summary: ReportSummary;
  fromDate: string;
  toDate: string;
}

/**
 * Generate a professional contribution report PDF.
 * Uses jsPDF + jspdf-autotable for clean table rendering.
 */
export function generateReportPDF(options: ReportPDFOptions): jsPDF {
  const { contributors, summary, fromDate, toDate } = options;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const now = new Date();
  const generatedDate = now.toLocaleDateString("en-GB");
  const generatedTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // ─── Colors ────────────────────────────────────────────────────────
  const primaryBlue: [number, number, number] = [37, 99, 235]; // #2563EB
  const darkBg: [number, number, number] = [15, 23, 42]; // #0F172A
  const lightText: [number, number, number] = [248, 250, 252]; // #F8FAFC
  const mutedText: [number, number, number] = [148, 163, 184]; // #94A3B8
  const cardBg: [number, number, number] = [30, 41, 59]; // #1E293B
  const white: [number, number, number] = [255, 255, 255];
  const emerald: [number, number, number] = [16, 185, 129]; // #10B981

  // ─── Header ────────────────────────────────────────────────────────
  // Background bar
  doc.setFillColor(...darkBg);
  doc.rect(0, 0, pageWidth, 45, "F");

  // Accent line
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 45, pageWidth, 2, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...white);
  doc.text("Teqemach", margin, 18);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mutedText);
  doc.text("Contribution Report", margin, 26);

  // Report period (right side)
  doc.setFontSize(9);
  doc.setTextColor(...mutedText);
  const periodLines = [
    `From: ${fromDate || "All time"}`,
    `To: ${toDate || "Present"}`,
    `Generated: ${generatedDate} ${generatedTime}`,
  ];
  periodLines.forEach((line, i) => {
    doc.text(line, pageWidth - margin, 14 + i * 5, { align: "right" });
  });

  let yPos = 55;

  // ─── Summary Section ───────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...darkBg);
  doc.text("Report Summary", margin, yPos);
  yPos += 6;

  const summaryItems = [
    { label: "Total Contributors", value: String(summary.totalContributors) },
    { label: "Total Contribution Days", value: String(summary.totalContributionDays) },
    { label: "Total Amount", value: `ETB ${summary.totalAmount.toLocaleString()}` },
   
  ];

  // Draw summary boxes (3 columns × 2 rows)
  const boxW = (contentWidth - 8) / 3;
  const boxH = 18;
  const boxGap = 4;

  summaryItems.forEach((item, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = margin + col * (boxW + boxGap);
    const y = yPos + row * (boxH + boxGap);

    // Box background
    doc.setFillColor(240, 245, 255);
    doc.roundedRect(x, y, boxW, boxH, 2, 2, "F");

    // Border
    doc.setDrawColor(200, 215, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, boxW, boxH, 2, 2, "S");

    // Label
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...mutedText);
    doc.text(item.label, x + 4, y + 6);

    // Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...darkBg);
    doc.text(item.value, x + 4, y + 14);
  });

  yPos +=  (boxH + boxGap) + 4 ;

  // ─── Contributors Table ────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...darkBg);
  doc.text("Contributors Detail", margin, yPos);
  yPos += 4;

  const tableHead = [["No.", "Contributor", "Contribution Dates", "Total Days", "Total Amount (ETB)", "Group"]];
  const tableBody = contributors.map((c, i) => [
    String(i + 1),
    c.contributorName  ,
    c.dates.join("\n"),
    String(c.totalDays),
    `ETB ${c.totalAmount.toLocaleString()}`,
    c.groupName,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: tableHead,
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: primaryBlue,
      textColor: white,
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [50, 50, 50],
      cellPadding: 3,
      lineColor: [220, 225, 235],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 255],
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      1: { cellWidth: 30 },
      2: { cellWidth: 40, overflow: "linebreak" },
      3: { halign: "center", cellWidth: 30 },
      4: { halign: "right", cellWidth: 28 },
      5: { cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
    showHead: "everyPage",
    didDrawPage: (data: any) => {
      // Footer on every page
      const pageCount = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...mutedText);
      doc.text("Generated by Teqemach", margin, pageHeight - 8);
      doc.text(`Page ${currentPage} of ${pageCount}`, pageWidth - margin, pageHeight - 8, {
        align: "right",
      });
    },
  });

  // ─── Grand Totals ──────────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable?.finalY ?? yPos + 20;

  if (finalY + 25 > pageHeight - 20) {
    doc.addPage();
    yPos = 20;
  } else {
    yPos = finalY + 8;
  }


  // ─── Update footers with correct page count ────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...mutedText);
    // Clear footer area
    doc.setFillColor(255, 255, 255);
    doc.rect(0, pageHeight - 12, pageWidth, 12, "F");
    // Re-draw footer
    doc.text("Generated by Teqemach", margin, pageHeight - 8);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, {
      align: "right",
    });
  }

  // ─── Return doc ──────────────────────────────────────────────────────────
  return doc;
}
