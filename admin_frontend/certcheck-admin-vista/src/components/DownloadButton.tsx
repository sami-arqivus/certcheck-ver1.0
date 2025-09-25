import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface DownloadButtonProps {
  data: any[];
  filename: string;
  headers: string[];
  title: string;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  data,
  filename,
  headers,
  title,
}) => {
  const downloadCSV = () => {
    if (!data.length) return;

    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const key = header.toLowerCase().replace(/\s+/g, '_');
          const value = row[key] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadExcel = () => {
    if (!data.length) return;

    const worksheet = XLSX.utils.json_to_sheet(
      data.map(row => {
        const newRow: any = {};
        headers.forEach(header => {
          const key = header.toLowerCase().replace(/\s+/g, '_');
          newRow[header] = row[key] || '';
        });
        return newRow;
      })
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, title);
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const downloadPDF = () => {
    if (!data.length) return;

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 15);
    
    // Prepare data for table
    const tableData = data.map(row =>
      headers.map(header => {
        const key = header.toLowerCase().replace(/\s+/g, '_');
        return String(row[key] || '');
      })
    );

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [71, 85, 105] },
    });

    doc.save(`${filename}.pdf`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={downloadCSV} className="gap-2">
          <FileText className="h-4 w-4" />
          Download as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadExcel} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Download as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadPDF} className="gap-2">
          <File className="h-4 w-4" />
          Download as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};