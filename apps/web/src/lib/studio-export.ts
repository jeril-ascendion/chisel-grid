/**
 * Studio document → docx | pdf | markdown.
 *
 * All formatters are intentionally simple: a top-level title, a category sub-
 * line, then each section as Heading 1 + body. Grid embeds are rendered as a
 * caption line referencing the diagram. PDF and DOCX use built-in fonts so
 * the bundle stays small in the Lambda runtime.
 */

import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  PageBreak,
} from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface SectionRef {
  type: 'chamber' | 'grid';
  id: string;
  label?: string;
}

export interface ExportSection {
  title: string;
  description?: string;
  source: 'chamber' | 'grid' | 'manual';
  body: string;
  ref?: SectionRef | null;
}

export interface ExportDocument {
  title: string;
  category?: string | null;
  sections: ExportSection[];
}

const CATEGORY_LABELS: Record<string, string> = {
  solutions_design: 'Solutions Design',
  rfp_response: 'RFP Response',
  architecture_review: 'Architecture Review',
  incident_report: 'Incident Report',
  migration_runbook: 'Migration Runbook',
  api_design: 'API Design',
  feasibility_study: 'Feasibility Study',
  security_review: 'Security Review',
  data_architecture: 'Data Architecture',
  engineering_proposal: 'Engineering Proposal',
};

function categoryLabel(cat: string | null | undefined): string | null {
  if (!cat) return null;
  return CATEGORY_LABELS[cat] ?? cat;
}

export function toMarkdown(doc: ExportDocument): string {
  const parts: string[] = [];
  parts.push(`# ${doc.title}`);
  const cat = categoryLabel(doc.category);
  if (cat) parts.push(`_${cat}_`);
  parts.push('');
  for (const section of doc.sections) {
    parts.push(`## ${section.title}`);
    if (section.description) parts.push(`_${section.description}_`);
    parts.push('');
    if (section.body && section.body.trim().length > 0) {
      parts.push(section.body);
    } else {
      parts.push('_(empty section)_');
    }
    if (section.ref?.type === 'grid') {
      parts.push('');
      parts.push(`> Grid diagram: ${section.ref.label ?? section.ref.id}`);
    }
    parts.push('');
  }
  return parts.join('\n');
}

export async function toDocx(doc: ExportDocument): Promise<Buffer> {
  const cat = categoryLabel(doc.category);
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: doc.title, bold: true, size: 36 })],
    }),
  ];
  if (cat) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: cat, italics: true, size: 22 })],
      }),
    );
  }
  children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));

  for (const section of doc.sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: section.title, bold: true, size: 28 })],
      }),
    );
    if (section.description) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: section.description, italics: true, size: 20 })],
        }),
      );
    }
    const body = section.body && section.body.trim().length > 0 ? section.body : '(empty section)';
    for (const line of body.split('\n')) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: line, size: 22 })],
        }),
      );
    }
    if (section.ref?.type === 'grid') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Grid diagram: ${section.ref.label ?? section.ref.id}`,
              italics: true,
              size: 20,
            }),
          ],
        }),
      );
    }
    children.push(new Paragraph({ children: [new PageBreak()] }));
  }

  const document = new Document({
    sections: [{ children }],
  });
  return Packer.toBuffer(document);
}

interface PdfWriter {
  page: import('pdf-lib').PDFPage;
  y: number;
}

export async function toPdf(doc: ExportDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const PAGE_W = 595.28; // A4 in points
  const PAGE_H = 841.89;
  const MARGIN = 56;
  const LINE_H = 14;
  const ink = rgb(0.06, 0.06, 0.06);
  const muted = rgb(0.31, 0.31, 0.31);

  let writer: PdfWriter = {
    page: pdf.addPage([PAGE_W, PAGE_H]),
    y: PAGE_H - MARGIN,
  };

  function ensureSpace(lines: number): void {
    if (writer.y - lines * LINE_H < MARGIN) {
      writer = { page: pdf.addPage([PAGE_W, PAGE_H]), y: PAGE_H - MARGIN };
    }
  }

  function wrap(text: string, maxWidth: number, f: typeof font, size: number): string[] {
    const out: string[] = [];
    for (const rawLine of text.split('\n')) {
      if (rawLine.length === 0) {
        out.push('');
        continue;
      }
      const words = rawLine.split(' ');
      let current = '';
      for (const w of words) {
        const candidate = current.length === 0 ? w : `${current} ${w}`;
        const width = f.widthOfTextAtSize(candidate, size);
        if (width > maxWidth && current.length > 0) {
          out.push(current);
          current = w;
        } else {
          current = candidate;
        }
      }
      if (current.length > 0) out.push(current);
    }
    return out;
  }

  function draw(text: string, opts: { size?: number; bold?: boolean; italic?: boolean; color?: ReturnType<typeof rgb> } = {}): void {
    const size = opts.size ?? 11;
    const f = opts.bold ? fontBold : opts.italic ? fontItalic : font;
    const color = opts.color ?? ink;
    const maxWidth = PAGE_W - MARGIN * 2;
    const lines = wrap(text, maxWidth, f, size);
    for (const line of lines) {
      ensureSpace(1);
      writer.page.drawText(line, {
        x: MARGIN,
        y: writer.y,
        size,
        font: f,
        color,
      });
      writer.y -= LINE_H;
    }
  }

  draw(doc.title, { size: 22, bold: true });
  writer.y -= 4;
  const cat = categoryLabel(doc.category);
  if (cat) draw(cat, { italic: true, color: muted, size: 12 });
  writer.y -= 8;

  for (const section of doc.sections) {
    ensureSpace(3);
    writer.y -= 6;
    draw(section.title, { size: 14, bold: true });
    if (section.description) {
      draw(section.description, { italic: true, color: muted, size: 10 });
    }
    writer.y -= 4;
    const body = section.body && section.body.trim().length > 0 ? section.body : '(empty section)';
    draw(body, { size: 11 });
    if (section.ref?.type === 'grid') {
      draw(`Grid diagram: ${section.ref.label ?? section.ref.id}`, { italic: true, color: muted, size: 10 });
    }
    writer.y -= 12;
  }

  return pdf.save();
}
