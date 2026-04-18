import { spawn, spawnSync } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { accessSync } from 'node:fs';
import { access, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import { XLSX_MIME_TYPE, type BuiltFile } from './built-file';

const LIBREOFFICE_BINARIES = ['soffice', 'libreoffice'] as const;
const LIBREOFFICE_COMMON_PATHS = [
  '/Applications/LibreOffice.app/Contents/MacOS/soffice',
  '/opt/homebrew/bin/soffice',
  '/usr/local/bin/soffice',
  '/usr/bin/soffice',
] as const;
const TEMP_FILLED_FILE_NAME = 'template-filled.xlsx';

export type XlsxCell = {
  value(): unknown;
  value(value: unknown): XlsxCell;
  formula(): unknown;
  formula(formulaValue: string): XlsxCell;
  style(name: string): unknown;
  style(name: string, value: unknown): XlsxCell;
  style(styleMap: Record<string, unknown>): XlsxCell;
};

export type XlsxColumn = {
  width(): number;
  width(widthValue: number): XlsxColumn;
};

export type XlsxSheet = {
  cell(address: string): XlsxCell;
  column(columnName: string): XlsxColumn;
};

export type XlsxWorkbook = {
  sheet(name: string): XlsxSheet | undefined;
  toFileAsync(path: string): Promise<void>;
};

type XlsxPopulateModule = {
  fromFileAsync(path: string): Promise<XlsxWorkbook>;
};

const xlsxPopulateModule = require('xlsx-populate') as XlsxPopulateModule;

export type FillTemplateWorkbookOptions<TCalculated = unknown> = {
  templatePath: string;
  outputFileName: string;
  fillWorkbook: (workbook: XlsxWorkbook) => Promise<void> | void;
  readCalculated?:
    | ((workbook: XlsxWorkbook) => Promise<TCalculated> | TCalculated)
    | undefined;
};

export type FilledTemplateWorkbookResult<TCalculated = unknown> = {
  builtFile: BuiltFile;
  calculatedData?: TCalculated;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return 'Unknown error';
}

async function openWorkbook(
  workbookPath: string,
  errorPrefix: string,
): Promise<XlsxWorkbook> {
  try {
    return await xlsxPopulateModule.fromFileAsync(workbookPath);
  } catch (error) {
    throw new Error(`${errorPrefix}: ${workbookPath}. ${toErrorMessage(error)}`);
  }
}

function assertTemplateExists(absoluteTemplatePath: string) {
  try {
    accessSync(absoluteTemplatePath, fsConstants.F_OK | fsConstants.R_OK);
  } catch {
    throw new Error(`XLSX template file not found: ${absoluteTemplatePath}`);
  }
}

function resolveLibreOfficeBinary(): string {
  const envOverride = process.env.LIBREOFFICE_BINARY?.trim();
  const candidates = [
    ...(envOverride ? [envOverride] : []),
    ...LIBREOFFICE_BINARIES,
    ...LIBREOFFICE_COMMON_PATHS,
  ];

  for (const candidate of candidates) {
    const probeResult = spawnSync(candidate, ['--version'], {
      stdio: 'ignore',
    });

    if (!probeResult.error) {
      return candidate;
    }
  }

  throw new Error(
    'LibreOffice executable not found. Set LIBREOFFICE_BINARY or add "soffice"/"libreoffice" to PATH.',
  );
}

async function runCommand(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';

    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      rejectPromise(error);
    });

    child.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolvePromise();

        return;
      }

      const stderrOutput = stderr.trim();
      const suffix = stderrOutput.length > 0 ? `: ${stderrOutput}` : '';

      rejectPromise(
        new Error(`LibreOffice recalculation failed with code ${exitCode}${suffix}`),
      );
    });
  });
}

async function recalculateWorkbook(
  libreOfficeBinary: string,
  filledWorkbookPath: string,
  recalculatedDirectoryPath: string,
): Promise<string> {
  await mkdir(recalculatedDirectoryPath, { recursive: true });

  await runCommand(libreOfficeBinary, [
    '--headless',
    '--convert-to',
    'xlsx',
    '--outdir',
    recalculatedDirectoryPath,
    filledWorkbookPath,
  ]);

  const recalculatedPath = join(
    recalculatedDirectoryPath,
    basename(filledWorkbookPath),
  );

  await access(recalculatedPath, fsConstants.F_OK | fsConstants.R_OK);

  return recalculatedPath;
}

export async function fillTemplateWorkbook<TCalculated = unknown>(
  options: FillTemplateWorkbookOptions<TCalculated>,
): Promise<FilledTemplateWorkbookResult<TCalculated>> {
  const absoluteTemplatePath = resolve(options.templatePath);

  assertTemplateExists(absoluteTemplatePath);

  const libreOfficeBinary = resolveLibreOfficeBinary();
  const workingDirectoryPath = await mkdtemp(join(tmpdir(), 'report-xlsx-'));
  const filledWorkbookPath = join(workingDirectoryPath, TEMP_FILLED_FILE_NAME);
  const recalculatedDirectoryPath = join(workingDirectoryPath, 'recalculated');

  try {
    const templateWorkbook = await openWorkbook(
      absoluteTemplatePath,
      'Failed to read XLSX template file',
    );

    await options.fillWorkbook(templateWorkbook);
    await templateWorkbook.toFileAsync(filledWorkbookPath);

    const recalculatedPath = await recalculateWorkbook(
      libreOfficeBinary,
      filledWorkbookPath,
      recalculatedDirectoryPath,
    );

    const recalculatedWorkbook = await openWorkbook(
      recalculatedPath,
      'Failed to open recalculated XLSX file',
    );
    const calculatedData = options.readCalculated
      ? await options.readCalculated(recalculatedWorkbook)
      : undefined;
    const bytes = new Uint8Array(await readFile(recalculatedPath));

    return {
      builtFile: {
        fileName: options.outputFileName,
        mimeType: XLSX_MIME_TYPE,
        bytes,
      },
      calculatedData,
    };
  } finally {
    await rm(workingDirectoryPath, {
      recursive: true,
      force: true,
    }).catch(() => undefined);
  }
}
