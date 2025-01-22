// excelUtils.js

const ExcelJS = require('exceljs');
const fs = require('fs');

const standardColumns = [
    { header: 'E_ID', key: 'id', width: 15 },
    { header: 'E_Title', key: 'title', width: 40 },
    { header: 'E_Client', key: 'client', width: 30 },
    { header: 'E_Start_Date', key: 'start', width: 15 },
    { header: 'E_End_Date', key: 'endDate', width: 15 },
    { header: 'E_Duration', key: 'duration', width: 15 },
    { header: 'E_Scope', key: 'scope', width: 15 },
    { header: 'E_Location', key: 'location', width: 20 },
    { header: 'E_Language', key: 'language', width: 15 },
    { header: 'E_Expertise', key: 'expertise', width: 20 },
    { header: 'E_Level', key: 'level', width: 15 },
    { header: 'E_Category', key: 'category', width: 20 },
    { header: 'E_Status', key: 'status', width: 15 },
    { header: 'E_Deadline', key: 'deadline', width: 20 },
    { header: 'E_URL', key: 'url', width: 50 },
    { header: 'E_Source', key: 'source', width: 15 }
];

async function saveToExcel(jobs, filePath) {
    try {
        const workbook = new ExcelJS.Workbook();
        let worksheet;
        let existingIds = new Set();

        if (fs.existsSync(filePath)) {
            await workbook.xlsx.readFile(filePath);
            worksheet = workbook.getWorksheet('Jobs') || workbook.addWorksheet('Jobs');
            
            if (worksheet) {
                worksheet.getColumn('E_ID').eachCell({ includeEmpty: false }, cell => {
                    if (cell.value && cell.row > 1) {
                        existingIds.add(cell.value);
                    }
                });
            }
        } else {
            worksheet = workbook.addWorksheet('Jobs');
            worksheet.columns = standardColumns;
        }

        // Ensure headers are set correctly
        worksheet.columns = standardColumns;

        let newRowCount = 0;

        // Add new jobs with standardized structure
        jobs.forEach(job => {
            if (!existingIds.has(job.id)) {
                const standardizedJob = {
                    id: job.id,
                    title: job.title || '',
                    client: job.client || '',
                    start: job.start || job.startDate || '',
                    endDate: job.endDate || '',
                    duration: job.duration || '',
                    scope: job.scope || '',
                    location: job.location || job.city || '',
                    language: job.language || '',
                    expertise: job.expertise || '',
                    level: job.level || '',
                    category: job.category || '',
                    status: job.status || '',
                    deadline: job.deadline || '',
                    url: job.url || '',
                    source: job.source || ''
                };
                worksheet.addRow(standardizedJob);
                newRowCount++;
            }
        });

        // Remove any existing table
        worksheet.tables = {};

        // Only add table if there are rows
        if (worksheet.rowCount > 1) {
            const tableRows = worksheet.getRows(2, worksheet.rowCount - 1);
            if (tableRows && tableRows.length > 0) {
                worksheet.addTable({
                    name: 'JobsTable',
                    ref: 'A1',
                    headerRow: true,
                    totalsRow: false,
                    style: {
                        theme: 'TableStyleMedium2',
                        showRowStripes: true,
                    },
                    columns: standardColumns.map(col => ({
                        name: col.header,
                        filterButton: true
                    })),
                    rows: tableRows.map(row => 
                        standardColumns.map(col => row.getCell(col.key).value)
                    )
                });
            }
        }

        await workbook.xlsx.writeFile(filePath);
        return newRowCount;
    } catch (error) {
        throw new Error(`Excel save error: ${error.message}`);
    }
}

module.exports = {
    standardColumns,
    saveToExcel
};