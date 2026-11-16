import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { gerarSlug } from '../../utils/slug.js'
import './Landing.css'

/*
 * Landing do iCardápio.
 *
 * Direção: cartaz de rua (skill design-taste-frontend, seed 1126071203) — a
 * página é um cardápio de balcão: campos de cor chapada, Anton em tudo que é
 * título, fotos recortadas por cima do tipo. Cada seção é um capítulo de cor,
 * e a barra fixa pega a tinta do capítulo que está embaixo dela.
 *
 * Tudo que a página afirma é verdade do produto hoje: cardápio no link, Pix/
 * cartão/dinheiro na entrega, taxa por bairro, pedido com status e nenhuma
 * comissão. O cadastro passa por revisão antes de a loja entrar no ar — a
 * página diz isso no passo 3, em vez de prometer "no ar na hora".
 */

const PERGUNTAS = [
  {
    aba: 'App',
    pergunta: 'O cliente precisa instalar algum aplicativo?',
    resposta:
      'Não. O cardápio abre no navegador do celular, pelo link da loja. O cliente escolhe os itens, informa o endereço e pede — sem baixar nada e sem criar conta.',
  },
  {
    aba: 'Preço',
    pergunta: 'Quanto custa usar o iCardápio?',
    resposta:
      'Começar é grátis: não há mensalidade para montar o cardápio e não cobramos comissão por pedido. O valor da venda cai inteiro com você — o pagamento é combinado na entrega ou na retirada.',
  },
  {
    aba: 'Revisão',
    pergunta: 'Quanto tempo leva para o cardápio entrar no ar?',
    resposta:
      'Criar a conta leva dois minutos e o cardápio é seu para montar na hora. Antes de publicar, revisamos o cadastro para a loja não ir ao ar com preço errado. Depois disso, é só divulgar o link.',
  },
  {
    aba: 'Pedidos',
    pergunta: 'Onde os pedidos aparecem?',
    resposta:
      'No painel da loja, com o status de cada um: aceito, em preparo, pronto, saiu para entrega e entregue. O cliente acompanha pelo mesmo link, então ele não precisa ligar para saber se o pedido saiu.',
  },
  {
    aba: 'Cadastro',
    pergunta: 'Preciso de CNPJ para abrir a loja?',
    resposta:
      'Não. O cadastro pede o nome da loja, o endereço do cardápio, um telefone e o e-mail do responsável. CNPJ não é exigido para começar.',
  },
]

export default function Landing() {
  const navegar = useNavigate()
  const [nomeLoja, setNomeLoja] = useState('Pizzaria do Zé')
  const [aberta, setAberta] = useState(0)

  // Barra fixa: pega a cor do capítulo que está passando por baixo dela.
  useEffect(() => {
    const capitulos = Array.from(
      document.querySelectorAll('.lp [data-fundo]:not(.lp-topo)'),
    )
    const barra = document.querySelector('.lp-topo')
    if (!barra) return undefined

    function atualizar() {
      const linha = 40
      const atual = capitulos.find((secao) => {
        const caixa = secao.getBoundingClientRect()
        return caixa.top <= linha && caixa.bottom > linha
      })

      barra.dataset.fundo = atual?.dataset.fundo || 'laranja'
    }

    atualizar()
    window.addEventListener('scroll', atualizar, { passive: true })
    window.addEventListener('resize', atualizar)

    return () => {
      window.removeEventListener('scroll', atualizar)
      window.removeEventListener('resize', atualizar)
    }
  }, [])

  // Entrada em cascata: cada bloco aparece quando entra na tela, uma vez só.
  // A classe só entra no DOM aqui: sem JS, o conteúdo aparece inteiro.
  useEffect(() => {
    const raiz = document.querySelector('.lp')
    const alvos = Array.from(document.querySelectorAll('.lp [data-anima]'))
    if (!raiz || !('IntersectionObserver' in window)) {
      alvos.forEach((alvo) => alvo.classList.add('lp-entrou'))
      return undefined
    }

    raiz.classList.add('lp-vivo')

    const olho = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            entrada.target.classList.add('lp-entrou')
            olho.unobserve(entrada.target)
          }
        })
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    )

    alvos.forEach((alvo) => olho.observe(alvo))
    return () => olho.disconnect()
  }, [])

  const slug = gerarSlug(nomeLoja).replace(/^-+|-+$/g, '') || 'sua-loja'

  function criar(evento) {
    evento.preventDefault()
    navegar(`/cadastro?nome=${encodeURIComponent(nomeLoja.trim())}`)
  }

  return (
    <div className="lp">
      <header className="lp-topo" data-fundo="laranja">
        <Link className="lp-topo__marca" to="/">
          iCardápio
        </Link>

        <div className="lp-topo__acoes">
          <Link className="lp-topo__entrar" to="/admin/login">
            Entrar
          </Link>
          <Link className="lp-botao lp-botao--topo" to="/cadastro">
            Criar cardápio
          </Link>
        </div>
      </header>

      {/* ---------- Capa ---------- */}
      <section className="lp-capa" data-fundo="laranja">
        <div className="lp-capa__palco">
          <h1 className="lp-capa__frase">
            <span className="lp-capa__linha lp-capa__linha--clara">Cardápio</span>
            <span className="lp-capa__linha lp-capa__linha--escura">no link</span>
          </h1>

          <figure className="lp-capa__foto">
            <img
              src="/prints/pizza-marguerita.jpg"
              alt="Pizza marguerita cortada em fatias"
              width="1000"
              height="667"
            />
          </figure>

          <figure className="lp-capa__foto lp-capa__foto--bebida">
            <img
              src="/prints/suco.jpg"
              alt="Copo de suco de laranja com uma rodela de laranja na borda"
              width="900"
              height="1350"
              loading="lazy"
            />
          </figure>

          <div className="lp-capa__nota">
            <p>
              Sem app e sem comissão. O cliente abre o link, escolhe e pede; o pedido
              cai no painel da loja.
            </p>
            <Link className="lp-capa__link" to="/demo-pizzaria">
              Ver o cardápio da Pizzaria do Zé funcionando →
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- O que já vem pronto ---------- */}
      <section className="lp-pronto" data-fundo="creme">
        <div className="lp-mosaico">
          <div className="lp-ladrilho lp-ladrilho--titulo" data-anima>
            <h2 className="lp-titulo-mosaico">O que já vem pronto</h2>
            <p className="lp-ladrilho__nota">
              Cada peça abaixo é uma tela do sistema — nada de maquete.
            </p>
          </div>

          <figure className="lp-ladrilho lp-ladrilho--creme-escuro lp-ladrilho--print" data-anima>
            <img
              className="lp-print"
              src="/prints/cardapio-mobile.webp"
              alt="Cardápio do cliente no celular, com capa, categorias e pratos"
              width="780"
              height="1688"
              loading="lazy"
            />
            <figcaption>
              <p className="lp-ladrilho__nome">É isto que o cliente vê</p>
              <p className="lp-ladrilho__nota">No celular, sem instalar nada.</p>
            </figcaption>
          </figure>

          <article className="lp-ladrilho lp-ladrilho--tinta lp-ladrilho--status" data-anima>
            <div className="lp-peca lp-peca--status" data-ui>
              <span className="lp-pilula">
                <i />
                Aberto agora
              </span>
              <span className="lp-pilula lp-pilula--vazia">fecha às 23h</span>
            </div>
            <p className="lp-ladrilho__nome">Aberto ou fechado</p>
            <p className="lp-ladrilho__nota">O horário decide se o pedido entra.</p>
          </article>

          <article className="lp-ladrilho lp-ladrilho--branco lp-ladrilho--item" data-anima>
            <div className="lp-peca lp-peca--item" data-ui>
              <img src="/prints/pizza-calabresa.jpg" alt="" width="240" height="240" loading="lazy" />
              <div>
                <strong>Pizza Calabresa</strong>
                <span>Calabresa fatiada, cebola e azeitonas</span>
                <b>R$ 45,90</b>
              </div>
            </div>
            <p className="lp-ladrilho__nome">Item com foto e preço</p>
            <p className="lp-ladrilho__nota">Descrição, foto e valor por prato.</p>
          </article>

          <figure className="lp-ladrilho lp-ladrilho--creme-escuro lp-ladrilho--print lp-ladrilho--gaveta" data-anima>
            <img
              className="lp-print"
              src="/prints/gaveta-mobile.webp"
              alt="Carrinho aberto com dois itens, quantidade e total"
              width="780"
              height="1688"
              loading="lazy"
            />
            <figcaption>
              <p className="lp-ladrilho__nome">Carrinho e total</p>
              <p className="lp-ladrilho__nota">Quantidade, observação e subtotal na mesma conta.</p>
            </figcaption>
          </figure>

          <article className="lp-ladrilho lp-ladrilho--branco lp-ladrilho--pg" data-anima>
            <div className="lp-peca lp-peca--pg" data-ui>
              <span className="lp-opcao lp-opcao--marcada">Pix</span>
              <span className="lp-opcao">Cartão</span>
              <span className="lp-opcao">Dinheiro</span>
            </div>
            <p className="lp-ladrilho__nome">Pix, cartão ou dinheiro</p>
            <p className="lp-ladrilho__nota">O cliente escolhe e paga na entrega.</p>
          </article>

          <article className="lp-ladrilho lp-ladrilho--tinta lp-ladrilho--pedido" data-anima>
            <div className="lp-peca lp-peca--pedido" data-ui>
              <p>
                <strong>Pedido #12</strong>
                <span>Em preparo</span>
              </p>
              <div className="lp-trilha">
                <i className="lp-trilha__ponto lp-trilha__ponto--feito" />
                <i className="lp-trilha__ponto lp-trilha__ponto--feito" />
                <i className="lp-trilha__ponto lp-trilha__ponto--atual" />
                <i className="lp-trilha__ponto" />
                <i className="lp-trilha__ponto" />
              </div>
            </div>
            <p className="lp-ladrilho__nome">Pedido com status</p>
            <p className="lp-ladrilho__nota">Da cozinha à entrega, o cliente acompanha.</p>
          </article>

          <article className="lp-ladrilho lp-ladrilho--laranja lp-ladrilho--bairros" data-anima>
            <ul className="lp-peca lp-peca--bairros" data-ui>
              <li>
                <span>Centro</span>
                <span>30 min</span>
                <b>R$ 6,00</b>
              </li>
              <li>
                <span>Vila Nova</span>
                <span>40 min</span>
                <b>R$ 9,00</b>
              </li>
              <li>
                <span>Jardim Sul</span>
                <span>50 min</span>
                <b>R$ 12,00</b>
              </li>
            </ul>
            <p className="lp-ladrilho__nome">Taxa por bairro</p>
            <p className="lp-ladrilho__nota">Cada bairro com seu preço e seu tempo.</p>
          </article>

          <article className="lp-ladrilho lp-ladrilho--creme-escuro lp-ladrilho--horas" data-anima>
            <ul className="lp-peca lp-peca--horas" data-ui>
              <li>
                Segunda a quinta <b>18h às 23h</b>
              </li>
              <li className="lp-peca__hoje">
                Sexta e sábado <b>18h às 1h</b>
              </li>
              <li>
                Domingo <b>18h às 22h</b>
              </li>
            </ul>
            <p className="lp-ladrilho__nome">Horário de funcionamento</p>
            <p className="lp-ladrilho__nota">Fechou? O pedido já não entra.</p>
          </article>

          <article className="lp-ladrilho lp-ladrilho--tinta lp-ladrilho--link" data-anima>
            <p className="lp-peca lp-peca--link" data-ui>
              icardapio.vercel.app/<b>pizzaria-do-ze</b>
            </p>
            <p className="lp-ladrilho__nome">Um link por loja</p>
            <p className="lp-ladrilho__nota">Divulgue no Instagram, no WhatsApp e na porta.</p>
          </article>
        </div>
      </section>

      {/* ---------- Como funciona ---------- */}
      <section className="lp-etapas" data-fundo="tinta">
        <div className="lp-etapas__conteudo">
          <h2 className="lp-etapas__titulo" data-anima>
            Do cadastro ao pedido
          </h2>

          <div className="lp-barra" data-anima>
            <div className="lp-barra__trecho">
              <span>Dois minutos</span>
              <p>Crie a conta e reserve o link.</p>
            </div>
            <div className="lp-barra__trecho">
              <span>Uma tarde</span>
              <p>Depois, cadastre pratos, fotos, bairros e horários.</p>
            </div>
            <div className="lp-barra__trecho">
              <span>Nossa revisão</span>
              <p>Conferimos o cadastro e publicamos o cardápio.</p>
            </div>
            <div className="lp-barra__trecho">
              <span>Todo dia</span>
              <p>O pedido cai no painel e o cliente acompanha pelo link.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- App x link ---------- */}
      <section className="lp-comparacao" data-fundo="branco">
        <div className="lp-comparacao__cabeca" data-anima>
          <h2 className="lp-comparacao__titulo">Sem comissão por pedido</h2>
          <p className="lp-comparacao__texto">
            Nos aplicativos de entrega, cada pedido paga uma porcentagem. Aqui, o
            cardápio é seu: o cliente pede pelo link, o valor cai inteiro com você e a
            única conta que existe é a do seu próprio delivery.
          </p>
        </div>

        <div className="lp-comparacao__par" data-anima>
          <div className="lp-especime">
            <div className="lp-especime__caixa">
              <span className="lp-especime__letra">App</span>
            </div>
            <p className="lp-especime__legenda">O que o cliente instala</p>
          </div>

          <div className="lp-especime lp-especime--inverso">
            <div className="lp-especime__caixa">
              <span className="lp-especime__letra">Link</span>
            </div>
            <p className="lp-especime__legenda">O que o cliente abre</p>
          </div>
        </div>
      </section>

      {/* ---------- Perguntas ---------- */}
      <section className="lp-perguntas" data-fundo="creme">
        <div className="lp-perguntas__conteudo">
          <h2 className="lp-perguntas__titulo" data-anima>
            Perguntas diretas
          </h2>

          <div className="lp-fichario" data-anima>
            {PERGUNTAS.map((item, indice) => {
              const abertaAgora = aberta === indice

              return (
                <div
                  key={item.aba}
                  className={`lp-ficha ${abertaAgora ? 'lp-ficha--aberta' : ''}`}
                  style={{ '--i': indice, zIndex: abertaAgora ? 30 : indice + 1 }}
                >
                  <button
                    className="lp-ficha__botao"
                    type="button"
                    aria-expanded={abertaAgora}
                    onClick={() => setAberta(abertaAgora ? -1 : indice)}
                  >
                    <span className="lp-ficha__aba">{item.aba}</span>
                    <span className="lp-ficha__pergunta">{item.pergunta}</span>
                  </button>

                  {abertaAgora && <p className="lp-ficha__resposta">{item.resposta}</p>}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------- Criar ---------- */}
      <section className="lp-criar" data-fundo="laranja">
        <div className="lp-criar__conteudo">
          <div className="lp-criar__chamada" data-anima>
            <h2 className="lp-criar__titulo">
              Comece pelo
              <br />
              nome
            </h2>
            <p className="lp-criar__texto">
              Digite o nome da sua loja e veja o endereço do cardápio. Depois é e-mail
              e senha; a loja entra no ar depois da nossa revisão.
            </p>
          </div>

          <form className="lp-form" data-ui onSubmit={criar} data-anima>
            <p className="lp-form__titulo">Crie seu cardápio</p>

            <label className="lp-form__campo">
              <span>Nome da sua loja</span>
              <input
                value={nomeLoja}
                onChange={(evento) => setNomeLoja(evento.target.value)}
                placeholder="Pizzaria do Zé"
                maxLength={60}
              />
            </label>

            <p className="lp-form__endereco">
              icardapio.vercel.app/<b>{slug}</b>
            </p>

            <button className="lp-botao lp-botao--largo" type="submit">
              Criar meu cardápio
            </button>

            <p className="lp-form__pe">
              Sem mensalidade e sem comissão por pedido. Você pode mudar o endereço
              depois.
            </p>
          </form>
        </div>
      </section>

      {/* ---------- Rodapé ---------- */}
      <footer className="lp-rodape" data-fundo="tinta">
        <div className="lp-rodape__topo" data-anima>
          <div className="lp-rodape__convite">
            <h2 className="lp-rodape__titulo">
              Seu cardápio
              <br />
              hoje
            </h2>
            <Link className="lp-botao lp-botao--claro" to="/cadastro">
              Criar meu cardápio
            </Link>
          </div>

          <div className="lp-rodape__links">
            <Link to="/demo-pizzaria">Cardápio de exemplo</Link>
            <Link to="/admin/login">Entrar no painel</Link>
            <Link to="/cadastro">Criar conta</Link>
          </div>
        </div>

        <div className="lp-rodape__creditos">
          <span>iCardápio · feito no Brasil</span>
          <span>Fotos de demonstração: Unsplash</span>
        </div>

        <p className="lp-rodape__marca" aria-hidden="true">
          iCardápio
        </p>
      </footer>
    </div>
  )
}
