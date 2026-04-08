import { NextRequest, NextResponse } from 'next/server'
import knowledgeData from '../../../../bia_knowledge_base.json'

export async function GET() {
  try {
    // Simply return the full knowledge base
    // Frontend can handle filtering
    return NextResponse.json({
      success: true,
      data: knowledgeData
    })
  } catch (error) {
    console.error('Knowledge API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load knowledge base' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query } = body

    // Here you could integrate with AI to answer specific questions about the knowledge base
    // For now, return a simple response

    return NextResponse.json({
      success: true,
      answer: `Analisando sua pergunta: "${query}"...`,
      suggestions: [
        'Quais tecidos têm mais artigos publicados?',
        'Qual a distribuição de TRL nos estudos?',
        'Quais biomateriais são mais usados?',
        'Onde estão as oportunidades para Quantis?'
      ]
    })
  } catch (error) {
    console.error('Knowledge query error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process query' },
      { status: 500 }
    )
  }
}
