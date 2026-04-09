import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // Inicialização atrasada para garantir que o NextJS não quebre no npm run build de variáveis não populadas globalmente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    const supabase = createClient(supabaseUrl, supabaseRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const textData = await req.text();
    const params = new URLSearchParams(textData);
    
    const body = params.get('Body') || '';
    const content = body.trim();
    const parts = content.split(' ');
    
    let xmlResponse = '';

    // Validação mínima
    if (parts.length < 2) {
      xmlResponse = `
        <Response>
          <Message>🤖 Faltou informação! O Formato correto é: [Valor] [Descrição] [Categoria]. Exemplo: 45.90 iFood Alimentação</Message>
        </Response>
      `;
      return new NextResponse(xmlResponse.trim(), { status: 200, headers: {'Content-Type': 'text/xml'} });
    }

    let amountStr = parts[0].replace('R$', '').replace('r$', '').trim();
    amountStr = amountStr.replace(',', '.');
    const amount = parseFloat(amountStr);

    if (isNaN(amount)) {
      xmlResponse = `
        <Response>
          <Message>🤖 Ops, o primeiro item precisa ser numérico pra gerar um gasto. O seu foi: "${parts[0]}".</Message>
        </Response>
      `;
      return new NextResponse(xmlResponse.trim(), { status: 200, headers: {'Content-Type': 'text/xml'} });
    }

    const categoryObj = parts.length > 2 ? parts[parts.length - 1] : 'Outros';
    const descArray = parts.slice(1, parts.length > 2 ? parts.length - 1 : parts.length);
    let description = descArray.join(' ') || 'Despesa Rápida';
    let category = categoryObj;
    const userId = process.env.WHATSAPP_USER_ID;

    // Detectar Cartão de Crédito (Magia de IA Simulada)
    const { data: cards } = await supabase.from('credit_cards').select('id, name').eq('user_id', userId);
    
    let transactionType = 'expense';
    let cardId = null;
    let cardNameLabel = '';

    if (cards && cards.length > 0) {
      for (const card of cards) {
        const cardNameLow = card.name.toLowerCase();
        if (content.toLowerCase().includes(cardNameLow)) {
          transactionType = 'credit';
          cardId = card.id;
          cardNameLabel = card.name;
          
          // Limpa o nome do cartão se ele foi pego como Categoria por engano
          if (category.toLowerCase() === cardNameLow) {
             category = descArray.length > 1 ? descArray.pop() || 'Outros' : 'Outros';
             description = descArray.join(' ') || 'Compra via App';
          } else {
             // Limpa o nome do cartão da descrição
             const regex = new RegExp(`\\b${card.name}\\b`, 'gi');
             description = description.replace(regex, '').replace(/\s+/g, ' ').trim();
          }
          break;
        }
      }
    }

    const tDate = new Date();
    tDate.setHours(tDate.getHours() - 3);
    const isoDate = tDate.toISOString().split('T')[0];

    const insertData: any = {
      amount: amount,
      description: description,
      category: category,
      type: transactionType,
      date: isoDate,
      installments: 1,
      user_id: userId
    };

    if (cardId) {
      insertData.credit_card_id = cardId;
    }

    const { error } = await supabase.from('transactions').insert(insertData);

    if (error) {
      console.error(error);
      xmlResponse = `<Response><Message>🤖 Erro no Banco: ${error.message}</Message></Response>`;
    } else {
      xmlResponse = `
        <Response>
          <Message>✅ O Cérebro do Sistema confirmou!
💰 Valor: R$ ${amount.toFixed(2).replace('.', ',')}
📝 Lancamento: ${description}
🗂 Categoria: ${category}
🗓 Gravado em: Hoje (${isoDate})
💳 Forma: ${transactionType === 'credit' ? `Cartão ${cardNameLabel}` : 'Dinheiro/Débito'}</Message>
        </Response>
      `;
    }

    return new NextResponse(xmlResponse.trim(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
