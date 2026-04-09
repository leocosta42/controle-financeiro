export function getInvoicePeriod(txDate: string, closingDay: number, dueDay: number, description: string = '') {
  // NOVO MOTOR DE FATURAS CONFORME REGRA DE NEGÓCIO EXATA:
  // - Data real da compra gravada no banco.
  // - Se Dia <= closingDay: Fatura do mês da compra.
  // - Se Dia > closingDay: Fatura do mês seguinte.
  
  const [yyyy, mm, dd] = txDate.split('T')[0].split('-');
  let year = parseInt(yyyy, 10);
  let month = parseInt(mm, 10);
  const day = parseInt(dd, 10);

  let invoiceYear = year;
  let invoiceMonth = month;

  // Regra Exata da Base: se passou do fechamento, pula de "ciclo".
  if (day > closingDay) {
    invoiceMonth += 1;
  }

  // DESLOCAMENTO DE CAIXA (CASH FLOW MAPPING):
  // Se o dia de vencimento é numericamente menor que o fechamento (ex: Fecha 28, Vence 5),
  // a fatura de um ciclo é matematicamente cobrada no mês civil seguinte.
  // Como as abas do app refletem o Mês de Pagamento do compromisso:
  if (dueDay < closingDay) {
    invoiceMonth += 1;
  }

  // Offset dinâmico: Extrai a parcela da descrição (ex: "(2/3)")
  let offset = 0;
  const match = description.match(/\((\d+)\/\d+\)/);
  if (match) {
    offset += parseInt(match[1], 10) - 1; // "1/3" -> +0, "2/3" -> +1
  }
  
  if (description.includes('[NEXT]')) {
    offset += 1; // Avança uma fatura se o usuário marcou "Começar na próxima"
  }

  invoiceMonth += offset;

  // Ajusta transbordamento de anos (ex: mês 14 -> Fevereiro do ano seguinte)
  while (invoiceMonth > 12) {
    invoiceMonth -= 12;
    invoiceYear += 1;
  }

  return { invoiceYear, invoiceMonth };
}
