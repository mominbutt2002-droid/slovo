import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import {
  DEFAULT_TEACHER_SCHEDULE_ROWS,
  formatDefaultRagDocumentText,
  formatTeacherRowsToTableText,
  SCHOOL_SERVICES,
  SCHOOL_WORKING_HOURS,
  TEACHER_TABLE_HEADERS,
  TeacherScheduleRow,
} from '../src/data/schoolCatalog.ts';

export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document';
export const GOOGLE_SHEET_MIME = 'application/vnd.google-apps.spreadsheet';
export const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface WorkspaceDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
}

export interface GlobalWorkspaceRagState {
  source: 'default' | 'google_workspace';
  ragFile: WorkspaceDriveFile | null;
  ragText: string;
  scheduleFile: WorkspaceDriveFile | null;
  scheduleSheetName: string | null;
  scheduleRows: TeacherScheduleRow[];
  scheduleTableText: string;
  lastSyncedAt: string | null;
}

const globalRagState: GlobalWorkspaceRagState = {
  source: 'default',
  ragFile: null,
  ragText: formatDefaultRagDocumentText(),
  scheduleFile: null,
  scheduleSheetName: null,
  scheduleRows: DEFAULT_TEACHER_SCHEDULE_ROWS,
  scheduleTableText: formatTeacherRowsToTableText(DEFAULT_TEACHER_SCHEDULE_ROWS),
  lastSyncedAt: null,
};

export function isValidGoogleFileId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{10,120}$/.test(id.trim());
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const match = authHeader.match(/^Bearer\s+([A-Za-z0-9\-._~+/]+=*)$/);
  return match?.[1] ?? null;
}

export function getPublicWorkspaceStatus() {
  return {
    source: globalRagState.source,
    ragFile: globalRagState.ragFile,
    ragPreview: globalRagState.ragText.slice(0, 600),
    ragCharCount: globalRagState.ragText.length,
    scheduleFile: globalRagState.scheduleFile,
    scheduleSheetName: globalRagState.scheduleSheetName,
    scheduleRows: globalRagState.scheduleRows,
    lastSyncedAt: globalRagState.lastSyncedAt,
  };
}

export function getLiveAgentPromptContext(): {
  catalogContext: string;
  teacherNames: string[];
  ragMeta: {
    source: 'default' | 'google_workspace';
    ragFileName: string | null;
    scheduleFileName: string | null;
    lastSyncedAt: string | null;
  };
} {
  const teacherNames = globalRagState.scheduleRows
    .map((r) => r.name.trim())
    .filter(Boolean);

  const ragHeader = globalRagState.ragFile
    ? `БАЗА ЗНАНИЙ (из Google-документа «${globalRagState.ragFile.name}», обновлено ${globalRagState.ragFile.modifiedTime}):`
    : 'БАЗА ЗНАНИЙ ШКОЛЫ (базовый справочник):';

  const scheduleHeader = globalRagState.scheduleFile
    ? `ТАБЛИЦА РАСПИСАНИЯ ПРЕПОДАВАТЕЛЕЙ (из таблицы «${globalRagState.scheduleFile.name}», лист «${globalRagState.scheduleSheetName || 'основной'}», обновлено ${globalRagState.scheduleFile.modifiedTime}):`
    : 'ТАБЛИЦА РАСПИСАНИЯ ПРЕПОДАВАТЕЛЕЙ (МСК):';

  const catalogContext = `${ragHeader}
${globalRagState.ragText}

${scheduleHeader}
${globalRagState.scheduleTableText}`;

  return {
    catalogContext,
    teacherNames,
    ragMeta: {
      source: globalRagState.source,
      ragFileName: globalRagState.ragFile?.name ?? null,
      scheduleFileName: globalRagState.scheduleFile?.name ?? null,
      lastSyncedAt: globalRagState.lastSyncedAt,
    },
  };
}

async function fetchDriveFileMetadata(
  accessToken: string,
  fileId: string
): Promise<WorkspaceDriveFile> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    fileId
  )}?fields=id,name,mimeType,modifiedTime,webViewLink&supportsAllDrives=true`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    if (res.status === 401) {
      throw new Error('AUTH_EXPIRED');
    }
    throw new Error(
      `Google Drive вернул ошибку ${res.status} при чтении файла (${errText.slice(0, 140)}).`
    );
  }
  return (await res.json()) as WorkspaceDriveFile;
}

function extractTextFromGoogleDocsJson(docJson: {
  body?: { content?: Array<Record<string, unknown>> };
}): string {
  const lines: string[] = [];
  const walkElements = (elements?: Array<Record<string, unknown>>) => {
    if (!Array.isArray(elements)) return;
    for (const el of elements) {
      const paragraph = el.paragraph as
        | { elements?: Array<{ textRun?: { content?: string } }> }
        | undefined;
      if (paragraph?.elements) {
        const text = paragraph.elements
          .map((e) => e.textRun?.content ?? '')
          .join('');
        if (text.trim()) lines.push(text.trimEnd());
      }
      const table = el.table as
        | {
            tableRows?: Array<{
              tableCells?: Array<{ content?: Array<Record<string, unknown>> }>;
            }>;
          }
        | undefined;
      if (table?.tableRows) {
        for (const row of table.tableRows) {
          const cells = (row.tableCells || []).map((cell) => {
            const cellLines: string[] = [];
            for (const cEl of cell.content || []) {
              const p = cEl.paragraph as
                | { elements?: Array<{ textRun?: { content?: string } }> }
                | undefined;
              if (p?.elements) {
                cellLines.push(
                  p.elements.map((e) => e.textRun?.content ?? '').join('').trim()
                );
              }
            }
            return cellLines.filter(Boolean).join(' ');
          });
          if (cells.some(Boolean)) {
            lines.push(`| ${cells.join(' | ')} |`);
          }
        }
      }
    }
  };
  walkElements(docJson.body?.content);
  return lines.join('\n').trim();
}

async function readRagDocContent(
  accessToken: string,
  meta: WorkspaceDriveFile
): Promise<string> {
  if (meta.mimeType === GOOGLE_DOC_MIME) {
    // Export Google Doc in .docx format and parse with mammoth for full fidelity
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      meta.id
    )}/export?mimeType=${encodeURIComponent(DOCX_MIME)}`;
    const exportRes = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (exportRes.ok) {
      const buf = Buffer.from(await exportRes.arrayBuffer());
      const extracted = await mammoth.extractRawText({ buffer: buf });
      const clean = extracted.value.replace(/\n{3,}/g, '\n\n').trim();
      if (clean) return clean.slice(0, 30000);
    }

    // Fallback to Google Docs API v1
    const docsRes = await fetch(
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(meta.id)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!docsRes.ok) {
      throw new Error(`Не удалось прочитать Google Документ (${docsRes.status}).`);
    }
    const docJson = (await docsRes.json()) as {
      body?: { content?: Array<Record<string, unknown>> };
    };
    return extractTextFromGoogleDocsJson(docJson).slice(0, 30000);
  }

  // Binary .docx or plain text file on Google Drive
  const mediaUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    meta.id
  )}?alt=media&supportsAllDrives=true`;
  const mediaRes = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!mediaRes.ok) {
    throw new Error(`Не удалось скачать .docx из Google Drive (${mediaRes.status}).`);
  }
  const buf = Buffer.from(await mediaRes.arrayBuffer());

  if (
    meta.mimeType === DOCX_MIME ||
    meta.name.toLowerCase().endsWith('.docx')
  ) {
    const extracted = await mammoth.extractRawText({ buffer: buf });
    return extracted.value.replace(/\n{3,}/g, '\n\n').trim().slice(0, 30000);
  }

  return buf.toString('utf8').trim().slice(0, 30000);
}

function normalizeCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function parse2DRowsToSchedule(rows2d: unknown[][]): {
  rows: TeacherScheduleRow[];
  tableText: string;
} {
  const nonEmpty = rows2d
    .map((r) => (Array.isArray(r) ? r.map(normalizeCell) : []))
    .filter((r) => r.some((cell) => cell.length > 0));

  if (nonEmpty.length === 0) {
    return { rows: [], tableText: 'Таблица расписания пуста.' };
  }

  const headerRow = nonEmpty[0];
  const dataRows = nonEmpty.slice(1);

  const findCol = (patterns: RegExp[], fallbackIdx: number): number => {
    const idx = headerRow.findIndex((h) =>
      patterns.some((re) => re.test(h.toLowerCase()))
    );
    return idx >= 0 ? idx : fallbackIdx;
  };

  const colName = findCol([/преподават|учител|фио|имя|name|teacher/], 0);
  const colExp = findCol([/стаж|опыт|experience/], 1);
  const colRole = findCol([/должност|регал|зван|role/], 2);
  const colSpec = findCol([/специализ|направлен|предмет|spec/], 3);
  const colLevels = findCol([/уровн|этап|level/], 4);
  const colMon = findCol([/^пн$|понедельник|mon/], 5);
  const colTue = findCol([/^вт$|вторник|tue/], 6);
  const colWed = findCol([/^ср$|среда|wed/], 7);
  const colThu = findCol([/^чт$|четверг|thu/], 8);
  const colFri = findCol([/^пт$|пятниц|fri/], 9);
  const colSat = findCol([/^сб$|суббот|sat/], 10);
  const colSun = findCol([/^вс$|воскресен|sun/], 11);

  const structured: TeacherScheduleRow[] = dataRows.map((row, idx) => {
    const get = (c: number) => (c >= 0 && c < row.length ? row[c] : '');
    const mon = get(colMon) || '—';
    const tue = get(colTue) || '—';
    const wed = get(colWed) || '—';
    const thu = get(colThu) || '—';
    const fri = get(colFri) || '—';
    const sat = get(colSat) || '—';
    const sun = get(colSun) || '—';

    const dayPairs: Array<[string, string]> = [
      ['Пн', mon],
      ['Вт', tue],
      ['Ср', wed],
      ['Чт', thu],
      ['Пт', fri],
      ['Сб', sat],
      ['Вс', sun],
    ];
    const activeDays = dayPairs
      .filter(([, val]) => val && val !== '—' && val !== '-' && !/выходн/i.test(val))
      .map(([d, val]) => `${d}: ${val}`)
      .join('; ');

    return {
      id: `sheet-row-${idx + 1}`,
      name: get(colName) || `Преподаватель ${idx + 1}`,
      experience: get(colExp) || '—',
      role: get(colRole) || 'Преподаватель русского языка',
      specialization: get(colSpec) || '—',
      levels: get(colLevels) || 'Все уровни',
      mon,
      tue,
      wed,
      thu,
      fri,
      sat,
      sun,
      summarySchedule: activeDays || 'По согласованию',
    };
  });

  // Also preserve exact raw columns in markdown table so any custom columns added by the user are visible to the AI Agent!
  const width = Math.max(...nonEmpty.map((r) => r.length));
  const padded = nonEmpty.map((r) =>
    Array.from({ length: width }, (_, i) => r[i] ?? '')
  );
  const mdHeader = `| ${padded[0].join(' | ')} |`;
  const mdSep = `| ${padded[0].map(() => '---').join(' | ')} |`;
  const mdBody = padded.slice(1).map((r) => `| ${r.join(' | ')} |`);

  return {
    rows: structured,
    tableText: [mdHeader, mdSep, ...mdBody].join('\n').slice(0, 25000),
  };
}

async function readScheduleSpreadsheet(
  accessToken: string,
  meta: WorkspaceDriveFile
): Promise<{
  sheetName: string;
  rows: TeacherScheduleRow[];
  tableText: string;
}> {
  if (meta.mimeType === GOOGLE_SHEET_MIME) {
    // Always fetch spreadsheet metadata first to discover actual tab name (never hardcode "Sheet1")
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        meta.id
      )}?fields=properties.title,sheets.properties.title`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!metaRes.ok) {
      throw new Error(`Не удалось получить листы Google Таблицы (${metaRes.status}).`);
    }
    const sheetMeta = (await metaRes.json()) as {
      sheets?: Array<{ properties?: { title?: string } }>;
    };
    const firstTab = sheetMeta.sheets?.[0]?.properties?.title;
    if (!firstTab) {
      throw new Error('В Google Таблице не найдено ни одного листа.');
    }

    const valuesRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        meta.id
      )}/values/${encodeURIComponent(firstTab)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!valuesRes.ok) {
      throw new Error(`Не удалось прочитать данные листа «${firstTab}» (${valuesRes.status}).`);
    }
    const valuesJson = (await valuesRes.json()) as { values?: unknown[][] };
    const parsed = parse2DRowsToSchedule(valuesJson.values || []);
    return {
      sheetName: firstTab,
      rows: parsed.rows,
      tableText: parsed.tableText,
    };
  }

  // Binary Excel (.xlsx / .xls) or CSV stored in Google Drive
  const mediaUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    meta.id
  )}?alt=media&supportsAllDrives=true`;
  const mediaRes = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!mediaRes.ok) {
    throw new Error(`Не удалось скачать Excel-таблицу из Google Drive (${mediaRes.status}).`);
  }
  const buf = Buffer.from(await mediaRes.arrayBuffer());
  const workbook = XLSX.read(buf, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0] || 'Лист1';
  const sheet = workbook.Sheets[firstSheetName];
  const rows2d = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
  });
  const parsed = parse2DRowsToSchedule(rows2d);
  return {
    sheetName: firstSheetName,
    rows: parsed.rows,
    tableText: parsed.tableText,
  };
}

export async function syncWorkspaceSourcesIfNeeded(params: {
  accessToken: string;
  ragFileId?: string | null;
  scheduleFileId?: string | null;
  force?: boolean;
}): Promise<{
  updated: boolean;
  status: ReturnType<typeof getPublicWorkspaceStatus>;
}> {
  const { accessToken, force } = params;
  const targetRagId = isValidGoogleFileId(params.ragFileId)
    ? params.ragFileId.trim()
    : globalRagState.ragFile?.id ?? null;
  const targetScheduleId = isValidGoogleFileId(params.scheduleFileId)
    ? params.scheduleFileId.trim()
    : globalRagState.scheduleFile?.id ?? null;

  let updated = false;

  if (targetRagId) {
    const meta = await fetchDriveFileMetadata(accessToken, targetRagId);
    const changed =
      force ||
      !globalRagState.ragFile ||
      globalRagState.ragFile.id !== meta.id ||
      globalRagState.ragFile.modifiedTime !== meta.modifiedTime;

    if (changed) {
      const text = await readRagDocContent(accessToken, meta);
      if (text) {
        globalRagState.ragFile = meta;
        globalRagState.ragText = text;
        globalRagState.source = 'google_workspace';
        updated = true;
      }
    }
  }

  if (targetScheduleId) {
    const meta = await fetchDriveFileMetadata(accessToken, targetScheduleId);
    const changed =
      force ||
      !globalRagState.scheduleFile ||
      globalRagState.scheduleFile.id !== meta.id ||
      globalRagState.scheduleFile.modifiedTime !== meta.modifiedTime;

    if (changed) {
      const sheetData = await readScheduleSpreadsheet(accessToken, meta);
      globalRagState.scheduleFile = meta;
      globalRagState.scheduleSheetName = sheetData.sheetName;
      globalRagState.scheduleRows = sheetData.rows;
      globalRagState.scheduleTableText = sheetData.tableText;
      globalRagState.source = 'google_workspace';
      updated = true;
    }
  }

  if (targetRagId || targetScheduleId) {
    globalRagState.lastSyncedAt = new Date().toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  return {
    updated,
    status: getPublicWorkspaceStatus(),
  };
}

export async function listWorkspaceDriveFiles(accessToken: string): Promise<{
  ragDocs: WorkspaceDriveFile[];
  scheduleSheets: WorkspaceDriveFile[];
}> {
  const qDocs = encodeURIComponent(
    `trashed = false and (mimeType = '${GOOGLE_DOC_MIME}' or mimeType = '${DOCX_MIME}')`
  );
  const qSheets = encodeURIComponent(
    `trashed = false and (mimeType = '${GOOGLE_SHEET_MIME}' or mimeType = '${XLSX_MIME}' or mimeType = 'application/vnd.ms-excel')`
  );
  const fields = encodeURIComponent(
    'files(id,name,mimeType,modifiedTime,webViewLink)'
  );

  const [docsRes, sheetsRes] = await Promise.all([
    fetch(
      `https://www.googleapis.com/drive/v3/files?q=${qDocs}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=25&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    ),
    fetch(
      `https://www.googleapis.com/drive/v3/files?q=${qSheets}&fields=${fields}&orderBy=modifiedTime%20desc&pageSize=25&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    ),
  ]);

  if (docsRes.status === 401 || sheetsRes.status === 401) {
    throw new Error('AUTH_EXPIRED');
  }

  if (!docsRes.ok || !sheetsRes.ok) {
    throw new Error('Не удалось получить список файлов из Google Drive.');
  }

  const docsJson = (await docsRes.json()) as { files?: WorkspaceDriveFile[] };
  const sheetsJson = (await sheetsRes.json()) as { files?: WorkspaceDriveFile[] };

  return {
    ragDocs: docsJson.files || [],
    scheduleSheets: sheetsJson.files || [],
  };
}

export async function buildSchoolRagDocxBuffer(): Promise<Buffer> {
  const serviceParagraphs = SCHOOL_SERVICES.flatMap((srv, i) => [
    new Paragraph({
      children: [
        new TextRun({
          text: `${i + 1}. ${srv.title} — ${srv.priceLabel}`,
          bold: true,
        }),
      ],
      spacing: { before: 140, after: 40 },
    }),
    new Paragraph({
      text: `Длительность и формат: ${srv.duration} · ${srv.format}`,
    }),
    new Paragraph({
      text: srv.description,
      spacing: { after: 80 },
    }),
  ]);

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: 'Школа русского языка «Словесность» — База знаний RAG',
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            text: 'Редактируйте этот .docx документ в Google Документах — AI-агент на сайте мгновенно получает обновлённые услуги, цены и часы работы.',
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: 'Время работы и контакты',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({ text: `• ${SCHOOL_WORKING_HOURS.weekdays}` }),
          new Paragraph({ text: `• ${SCHOOL_WORKING_HOURS.saturday}` }),
          new Paragraph({ text: `• ${SCHOOL_WORKING_HOURS.sunday}` }),
          new Paragraph({ text: `• ${SCHOOL_WORKING_HOURS.aiPlatform}` }),
          new Paragraph({ text: `• Адрес: ${SCHOOL_WORKING_HOURS.address}` }),
          new Paragraph({
            text: `• Телефон: ${SCHOOL_WORKING_HOURS.phone}`,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: 'Каталог услуг и цены',
            heading: HeadingLevel.HEADING_1,
          }),
          ...serviceParagraphs,
          new Paragraph({
            children: [
              new TextRun({
                text: '7. Бесплатный тариф AI-репетитора Free — 0 ₽',
                bold: true,
              }),
            ],
            spacing: { before: 140, after: 40 },
          }),
          new Paragraph({
            text: '10 минут практики в день (сброс в полночь 00:00), 5 бесплатных уроков, квизы, грамматика и правописание.',
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: 'Условия записи и переноса',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: '• Запись на занятия оформляется прямо в чате AI-агента на сайте или по телефону.',
          }),
          new Paragraph({
            text: '• Бесплатный перенос или отмена индивидуального урока возможны не позднее чем за 12 часов до начала.',
          }),
          new Paragraph({
            text: '• Подписка AI Pro оплачивается банковской картой через Stripe.',
          }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

export function buildTeacherScheduleXlsxBuffer(): Buffer {
  const rows: string[][] = [
    [...TEACHER_TABLE_HEADERS],
    ...DEFAULT_TEACHER_SCHEDULE_ROWS.map((t) => [
      t.name,
      t.experience,
      t.role,
      t.specialization,
      t.levels,
      t.mon,
      t.tue,
      t.wed,
      t.thu,
      t.fri,
      t.sat,
      t.sun,
    ]),
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 20 },
    { wch: 10 },
    { wch: 36 },
    { wch: 44 },
    { wch: 28 },
    { wch: 13 },
    { wch: 13 },
    { wch: 13 },
    { wch: 13 },
    { wch: 13 },
    { wch: 13 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Расписание преподавателей');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}

async function uploadMultipartToDrive(params: {
  accessToken: string;
  fileName: string;
  targetMimeType: string;
  contentMimeType: string;
  contentBuffer: Buffer;
}): Promise<WorkspaceDriveFile> {
  const boundary = `slovesnost_boundary_${Date.now()}`;
  const metadataPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      {
        name: params.fileName,
        mimeType: params.targetMimeType,
      }
    )}\r\n--${boundary}\r\nContent-Type: ${params.contentMimeType}\r\n\r\n`,
    'utf8'
  );
  const closingPart = Buffer.from(`\r\n--${boundary}--`, 'utf8');
  const body = Buffer.concat([metadataPart, params.contentBuffer, closingPart]);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );

  if (res.status === 401) {
    throw new Error('AUTH_EXPIRED');
  }
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(
      `Не удалось загрузить файл «${params.fileName}» в Google Drive (${res.status}: ${errText.slice(0, 140)}).`
    );
  }

  return (await res.json()) as WorkspaceDriveFile;
}

export async function createStarterWorkspaceFiles(accessToken: string): Promise<{
  ragFile: WorkspaceDriveFile;
  scheduleFile: WorkspaceDriveFile;
  status: ReturnType<typeof getPublicWorkspaceStatus>;
}> {
  const [docxBuf, xlsxBuf] = await Promise.all([
    buildSchoolRagDocxBuffer(),
    Promise.resolve(buildTeacherScheduleXlsxBuffer()),
  ]);

  // 1. Upload .docx file directly to Google Drive (editable natively in Google Docs as .docx)
  const ragFile = await uploadMultipartToDrive({
    accessToken,
    fileName: 'Словесность — База знаний RAG.docx',
    targetMimeType: DOCX_MIME,
    contentMimeType: DOCX_MIME,
    contentBuffer: docxBuf,
  });

  // 2. Upload Excel workbook and convert to live Google Sheet (editable in Google Sheets; also supports .xlsx uploads)
  const scheduleFile = await uploadMultipartToDrive({
    accessToken,
    fileName: 'Словесность — Расписание преподавателей',
    targetMimeType: GOOGLE_SHEET_MIME,
    contentMimeType: XLSX_MIME,
    contentBuffer: xlsxBuf,
  });

  const synced = await syncWorkspaceSourcesIfNeeded({
    accessToken,
    ragFileId: ragFile.id,
    scheduleFileId: scheduleFile.id,
    force: true,
  });

  return {
    ragFile,
    scheduleFile,
    status: synced.status,
  };
}
