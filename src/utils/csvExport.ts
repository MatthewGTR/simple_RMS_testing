export interface ExportableData {
  [key: string]: any;
}

export function exportToCSV(data: ExportableData[], filename: string) {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = Object.keys(data[0]);

  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';

        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportUsersToCSV(users: any[]) {
  const exportData = users.map(user => ({
    'Email': user.email || '',
    'Full Name': user.full_name || '',
    'Role': user.role || 'user',
    'Credits': user.credits || 0,
    'Created At': new Date(user.created_at).toLocaleString(),
    'Last Updated': user.updated_at ? new Date(user.updated_at).toLocaleString() : 'N/A'
  }));

  exportToCSV(exportData, 'users_export');
}

export function exportTransactionsToCSV(transactions: any[]) {
  const exportData = transactions.map(tx => ({
    'Date': new Date(tx.created_at).toLocaleString(),
    'User Email': tx.user_email || tx.email || 'Unknown',
    'Action Type': tx.action_type || 'Unknown',
    'Details': JSON.stringify(tx.details || {}),
    'Performed By': tx.performer_email || 'System'
  }));

  exportToCSV(exportData, 'transactions_export');
}
