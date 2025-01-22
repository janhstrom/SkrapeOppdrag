const axios = require('axios');
const fs = require('fs');

const siteUrl = 'https://yourcompany.shttps://eiqas.sharepoint.com/sites/Oppdrag/';
const listName = 'Oppdragsliste';
const username = 'jan@eiq.no';
const password = 'muzga2-natqib-cefjUk';

const updateSharePoint = async () => {
  // Fetch existing SharePoint list items
  const { data } = await axios.get(`${siteUrl}/_api/web/lists/getbytitle('${listName}')/items`, {
    auth: { username, password },
    headers: { Accept: 'application/json;odata=verbose' },
  });
  const existingIds = new Set(data.d.results.map(item => item.id));

  // Read the new data from CSV
  const csvData = fs.readFileSync('./jobs_Kons.csv', 'utf8');
  const newData = csvData
    .trim()
    .split('\n')
    .slice(1) // Remove header row
    .map(row => {
      const [id, title, client, deadline, url, source] = row.split(',');
      return { id, title, client, deadline, url, source };
    });

  // Identify new rows
  const rowsToAdd = newData.filter(row => !existingIds.has(row.id));

  // Add new rows to SharePoint list
  for (const row of rowsToAdd) {
    await axios.post(`${siteUrl}/_api/web/lists/getbytitle('${listName}')/items`, row, {
      auth: { username, password },
      headers: { 'Content-Type': 'application/json;odata=verbose' },
    });
  }

  console.log(`${rowsToAdd.length} new rows added.`);
};

updateSharePoint().catch(console.error);