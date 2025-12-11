// ============================================================
// IMPORTAÇÃO DO FIREBASE
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBEY_lIGuxVfdm77D7MsBPYdNPQfmOJCkE",
  authDomain: "universodoacai-bfa78.firebaseapp.com",
  databaseURL: "https://universodoacai-bfa78-default-rtdb.firebaseio.com",
  projectId: "universodoacai-bfa78",
  storageBucket: "universodoacai-bfa78.firebasestorage.app",
  messagingSenderId: "945100141316",
  appId: "1:945100141316:web:b146319a68c0ed6986d651",
  measurementId: "G-YJWLVLRCXM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================================
// VARIÁVEIS GLOBAIS
// ============================================================
const telefoneLoja = "5511999999999"; 
let cupomAplicado = 0; 
let produtoAtual = { nome: "", base: 0, maxSabores: 2, maxRecheios: 7, selecoes: { sabor: {}, recheio: {}, adicional: {} } };

// Arrays que serão preenchidos pelo Firebase
let saboresDB = [];
let recheiosDB = [];
let adicionaisDB = [];

// ============================================================
// CARREGAMENTO INICIAL
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    await carregarCardapioDoFirebase();
});

async function carregarCardapioDoFirebase() {
    try {
        // Carrega Sabores
        const saboresSnap = await getDocs(collection(db, "sabores"));
        saboresDB = [];
        saboresSnap.forEach(doc => saboresDB.push({ id: doc.id, ...doc.data() }));

        // Carrega Recheios
        const recheiosSnap = await getDocs(collection(db, "recheios"));
        recheiosDB = [];
        recheiosSnap.forEach(doc => recheiosDB.push({ id: doc.id, ...doc.data() }));

        // Carrega Adicionais
        const addsSnap = await getDocs(collection(db, "adicionais"));
        adicionaisDB = [];
        addsSnap.forEach(doc => adicionaisDB.push({ id: doc.id, ...doc.data() }));

        console.log("Cardápio carregado!");
    } catch (error) {
        console.error("Erro ao carregar Firebase:", error);
        alert("Erro ao conectar com o servidor.");
    }
}

// ============================================================
// LÓGICA DO CARDÁPIO (CLIENTE)
// ============================================================

window.abrirMontagem = function(nomeProduto, precoBase) {
    let limiteRecheios = 7;
    if (nomeProduto.includes("1 Litro")) limiteRecheios = 9;

    produtoAtual = { 
        nome: nomeProduto, base: precoBase,
        maxSabores: 2, maxRecheios: limiteRecheios,
        selecoes: { sabor: {}, recheio: {}, adicional: {} }
    };

    renderizarLista('sabor', saboresDB, 'lista-sabores');
    renderizarLista('recheio', recheiosDB, 'lista-recheios');
    renderizarLista('adicional', adicionaisDB, 'lista-adicionais');

    document.getElementById('produto-nome').innerText = nomeProduto;
    document.getElementById('produto-base-price').innerText = precoBase.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    document.getElementById('txt-limite-sabor').innerText = `(Até ${produtoAtual.maxSabores} opções)`;
    document.getElementById('txt-limite-recheio').innerText = `(Até ${produtoAtual.maxRecheios} itens)`;

    const slider = document.querySelector('.slider-container');
    slider.classList.remove('show-step-1'); slider.classList.add('show-step-2');
    document.getElementById('barra-pedido').classList.remove('hidden');
    calcularTotal();
}

window.voltarMenu = function() {
    const slider = document.querySelector('.slider-container');
    slider.classList.remove('show-step-2'); slider.classList.add('show-step-1');
    setTimeout(() => { document.getElementById('barra-pedido').classList.add('hidden'); }, 300);
}

function renderizarLista(tipo, dados, idContainer) {
    const container = document.getElementById(idContainer);
    container.innerHTML = "";
    dados.forEach((item, index) => {
        let precoHtml = item.preco ? `<div class="option-price">+ R$ ${item.preco.toFixed(2).replace('.',',')}</div>` : "";
        const html = `
        <div class="option-row" id="row-${tipo}-${index}">
            <div class="option-info">
                <img src="${item.img || 'logo.png'}" class="option-thumb" onerror="this.src='logo.png'">
                <div class="option-details"><div class="option-name">${item.nome}</div>${precoHtml}</div>
            </div>
            <div class="stepper">
                <button type="button" class="step-btn minus hidden" onclick="mudarQtd('${tipo}', ${index}, -1)">-</button>
                <span class="step-count hidden" id="qtd-${tipo}-${index}">0</span>
                <button type="button" class="step-btn plus" onclick="mudarQtd('${tipo}', ${index}, 1)">+</button>
            </div>
        </div>`;
        container.innerHTML += html;
    });
}

window.mudarQtd = function(tipo, index, delta) {
    const container = document.getElementById(`row-${tipo}-${index}`);
    const qtdSpan = document.getElementById(`qtd-${tipo}-${index}`);
    const btnMinus = container.querySelector('.minus');
    const btnPlus = container.querySelector('.plus');
    
    let dbLocal = (tipo === 'sabor') ? saboresDB : (tipo === 'recheio') ? recheiosDB : adicionaisDB;
    let nomeItem = dbLocal[index].nome;

    let atual = produtoAtual.selecoes[tipo][nomeItem] || 0;
    let novo = atual + delta;
    if (novo < 0) return;

    // Verifica limites (Só para sabor e recheio)
    if (delta > 0 && tipo !== 'adicional') {
        let total = Object.values(produtoAtual.selecoes[tipo]).reduce((a,b)=>a+b,0);
        let max = (tipo === 'sabor') ? produtoAtual.maxSabores : produtoAtual.maxRecheios;
        if (total >= max) {
            if(navigator.vibrate) navigator.vibrate(50);
            return;
        }
    }

    if (novo === 0) delete produtoAtual.selecoes[tipo][nomeItem];
    else produtoAtual.selecoes[tipo][nomeItem] = novo;

    qtdSpan.innerText = novo;
    if (novo > 0) {
        btnMinus.classList.remove('hidden'); qtdSpan.classList.remove('hidden');
        container.classList.add('selected-item'); 
        btnPlus.style.background = "#4b0082"; btnPlus.style.color = "white";
    } else {
        btnMinus.classList.add('hidden'); qtdSpan.classList.add('hidden');
        container.classList.remove('selected-item'); 
        btnPlus.style.background = "white"; btnPlus.style.color = "#4b0082";
    }
    
    verificarBloqueios(tipo);
    calcularTotal();
}

function verificarBloqueios(tipo) {
    if (tipo === 'adicional') return;
    let total = Object.values(produtoAtual.selecoes[tipo]).reduce((a,b)=>a+b,0);
    let max = (tipo === 'sabor') ? produtoAtual.maxSabores : produtoAtual.maxRecheios;
    const linhas = document.querySelectorAll(`[id^="row-${tipo}-"]`);
    if (total >= max) {
        linhas.forEach(row => { if (!row.classList.contains('selected-item')) row.classList.add('disabled'); });
    } else {
        linhas.forEach(row => row.classList.remove('disabled'));
    }
}

function calcularTotal() {
    let total = produtoAtual.base;
    for (let [nome, qtd] of Object.entries(produtoAtual.selecoes.adicional)) {
        let item = adicionaisDB.find(i => i.nome === nome);
        if (item && item.preco) total += (item.preco * qtd);
    }
    if(cupomAplicado > 0) {
        total = total * (1 - (cupomAplicado / 100));
    }
    document.getElementById('valorTotal').innerText = total.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    return total;
}

// --- VERIFICAÇÃO DE CUPOM ---
window.verificarCupom = async function() {
    const codigo = document.getElementById('cupomInput').value.toUpperCase();
    if(!codigo) return;

    const q = query(collection(db, "cupons"));
    const snapshot = await getDocs(q);
    let achou = false;

    snapshot.forEach(doc => {
        if(doc.data().codigo === codigo) {
            cupomAplicado = doc.data().valor;
            document.getElementById('msgCupom').innerText = `Desconto de ${cupomAplicado}% aplicado!`;
            document.getElementById('msgCupom').style.color = "green";
            achou = true;
            calcularTotal();
        }
    });

    if(!achou) {
        cupomAplicado = 0;
        document.getElementById('msgCupom').innerText = "Cupom inválido";
        document.getElementById('msgCupom').style.color = "red";
        calcularTotal();
    }
}

// --- FINALIZAR PEDIDO ---
window.enviarPedido = async function() {
    const nome = document.getElementById('clienteNome').value;
    const zap = document.getElementById('clienteZap').value;

    if(!nome || !zap) { alert("Preencha seu nome e WhatsApp!"); return; }
    let qtdSabores = Object.values(produtoAtual.selecoes.sabor).reduce((a,b)=>a+b,0);
    if (qtdSabores === 0) { alert("Escolha pelo menos 1 Sabor!"); return; }

    const total = calcularTotal();
    
    const pedido = {
        cliente: nome,
        telefone: zap,
        produto: produtoAtual.nome,
        total: total,
        status: 'pendente',
        data: new Date().toISOString(),
        detalhes: {
            sabores: produtoAtual.selecoes.sabor,
            recheios: produtoAtual.selecoes.recheio,
            adicionais: produtoAtual.selecoes.adicional
        }
    };

    try {
        // Salva no Firebase
        await addDoc(collection(db, "pedidos"), pedido);
        
        // Monta mensagem do WhatsApp
        let msg = `*🟣 NOVO PEDIDO (${nome})*\n-----------------\n`;
        msg += `🥣 *${pedido.produto}*\n`;
        
        msg += `🍦 *Sabores:*\n`;
        for (let [n, q] of Object.entries(pedido.detalhes.sabores)) msg += `${q}x ${n}\n`;
        
        if(Object.keys(pedido.detalhes.recheios).length > 0){
            msg += `\n🍫 *Recheios:*\n`;
            for (let [n, q] of Object.entries(pedido.detalhes.recheios)) msg += `${q}x ${n}\n`;
        }
        if(Object.keys(pedido.detalhes.adicionais).length > 0){
            msg += `\n💎 *Adicionais:*\n`;
            for (let [n, q] of Object.entries(pedido.detalhes.adicionais)) msg += `${q}x ${n}\n`;
        }

        msg += `\n💰 *TOTAL: R$ ${total.toFixed(2)}*`;
        
        window.open(`https://wa.me/${telefoneLoja}?text=${encodeURIComponent(msg)}`, '_blank');
        
        alert("Pedido registrado! Aguarde nosso contato.");
        location.reload();

    } catch (e) {
        console.error(e);
        alert("Erro ao enviar pedido. Tente novamente.");
    }
}

// ============================================================
// 4. CHATBOT E ABAS (UI GERAL)
// ============================================================

window.mudarAba = function(aba) {
    const header = document.getElementById('main-header');
    const viewCardapio = document.getElementById('view-cardapio');
    const viewChat = document.getElementById('view-chat');
    const btnCardapio = document.getElementById('btn-cardapio');
    const btnChat = document.getElementById('btn-chat');

    if (aba === 'cardapio') {
        header.className = 'header-purple';
        viewCardapio.classList.remove('hidden-section'); viewCardapio.classList.add('active-section');
        viewChat.classList.remove('active-section'); viewChat.classList.add('hidden-section');
        btnCardapio.classList.add('active'); btnChat.classList.remove('active');
    } else {
        header.className = 'header-whatsapp';
        viewCardapio.classList.remove('active-section'); viewCardapio.classList.add('hidden-section');
        viewChat.classList.remove('hidden-section'); viewChat.classList.add('active-section');
        btnCardapio.classList.remove('active'); btnChat.classList.add('active');
        rolarChat();
    }
}

window.rolarChat = function() { const div = document.getElementById('chatWindow'); div.scrollTop = div.scrollHeight; }

window.enviarMsg = function() {
    const input = document.getElementById('chatInput');
    const txt = input.value.trim();
    if(!txt) return;
    addSalao(txt, 'user');
    input.value = "";
    setTimeout(() => { const resp = gerarResposta(txt); addSalao(resp, 'bot'); }, 800);
}

function formatarTextoWhatsApp(texto) {
    let formatado = texto;
    formatado = formatado.replace(/\*(.*?)\*/g, '<b>$1</b>');
    formatado = formatado.replace(/_(.*?)_/g, '<i>$1</i>');
    formatado = formatado.replace(/\n/g, '<br>');
    return formatado;
}

function addSalao(texto, tipo) {
    const div = document.getElementById('chatWindow');
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const check = tipo === 'user' ? '<span style="color: #34b7f1; margin-left:5px">✓✓</span>' : '';
    let conteudo = (tipo === 'bot') ? formatarTextoWhatsApp(texto) : texto;
    const html = `<div class="msg msg-${tipo}"><div class="bubble">${conteudo}<span class="time">${time} ${check}</span></div></div>`;
    div.insertAdjacentHTML('beforeend', html);
    rolarChat();
}

function limparTexto(texto) {
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function detectingIntencao(textoLimpo) {
    const intents = {
        pix: ["pix", "pics", "px", "pxx", "chave", "pagar", "pagamento", "transferencia", "qr code", "qrcode", "banco", "conta", "cave", "chav", "pxxi", "piqs"],
        contato: ["falar", "humano", "atendente", "pessoa", "gente", "contato", "numero", "zap", "whatsapp", "ligar", "telefone", "fone", "celular", "duvida", "socorro", "ajuda"],
        endereco: ["onde", "fica", "local", "rua", "bairro", "endereco", "localizacao", "mapa", "chegar", "perto", "vcs sao de", "retirar", "buscar"],
        entrega: ["entrega", "entregam", "leva", "levam", "motoboy", "moto", "frete", "taxa", "valor entrega", "demora", "tempo", "chega rapido", "delivery", "envia"],
        horario: ["hora", "horario", "abre", "fecha", "funcionamento", "aberto", "fechado", "tarde", "noite", "manha", "domingo", "segunda", "sabado"],
        cartao: ["cartao", "credito", "debito", "visa", "master", "elo", "vr", "vale", "ticket", "alimentacao", "refeicao", "maquinha", "passa", "aceita"],
        saudacao: ["oi", "ola", "oii", "oie", "eai", "opa", "bom dia", "boa tarde", "boa noite", "hey", "alo"],
        agradecimento: ["obrigado", "brigado", "valeu", "top", "show", "massa", "perfeito", "ok", "tks"]
    };

    for (let categoria in intents) {
        const palavras = intents[categoria];
        const encontrou = palavras.some(p => {
            if (p.length <= 2) return new RegExp(`\\b${p}\\b`).test(textoLimpo) || textoLimpo.includes(p);
            return textoLimpo.includes(p);
        });
        if (encontrou) return categoria;
    }
    return "desconhecido";
}

function gerarResposta(textoUsuario) {
    const limpo = limparTexto(textoUsuario);
    const intencao = detectingIntencao(limpo);

    switch (intencao) {
        case "pix": return "💲 *Chave Pix (CNPJ):*\n`00.000.000/0001-00`\n(Clique para copiar)\n\n*Universo do Açaí LTDA*\n_Envie o comprovante aqui!_";
        case "contato": return "📞 *WhatsApp:* (11) 99999-9999\n_Eu sou um robô, mas pode ligar se preferir!_";
        case "endereco": return "📍 *Endereço:*\nRua das Palmeiras, 300 - Centro.\n_Referência: Ao lado da praça._";
        case "entrega": return "🛵 *Entrega:*\n🔹 Centro: Grátis\n🔹 Bairros: R$ 5,00 a R$ 10,00\n_Tempo: 30-50min_";
        case "horario": return "⏰ *Horário:*\nTerça a Domingo: 14h às 23h\nSegunda: Fechado.";
        case "cartao": return "💳 *Aceitamos:*\nPix, Dinheiro, Cartão (Crédito/Débito) e VR.";
        case "saudacao": return "Opa! 😄 Bem-vindo ao Universo do Açaí.\nPeça pelo cardápio ou tire sua dúvida aqui.";
        case "agradecimento": return "Tamo junto! 💜";
        default: return "Desculpe, não entendi 🤖.\nPergunte sobre: *Pix, Entrega, Endereço* ou peça no Cardápio!";
    }
}

window.tentarLoginAdmin = function() {
    const senha = prompt("🔒 Digite a senha de administrador:");
    if (senha === "HD1000") { // Senha definida no sistema
        sessionStorage.setItem('adminLogado', 'true');
        window.location.href = "admin.html";
    } else if (senha !== null) {
        alert("Senha incorreta!");
    }
}

// ============================================================
// 🛠️ SCRIPT DE CARGA INICIAL (Rode uma vez e apague depois)
// ============================================================
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

window.popularBancoDeDados = async function() {
    if(!confirm("Isso vai adicionar vários itens ao seu cardápio. Continuar?")) return;
    
    console.log("Iniciando cadastro...");

    // 1. SABORES (Base do Açaí)
    const saboresDB = [
        { nome: "Açaí Tradicional", estoque: 100 },
        { nome: "Açaí com Morango", estoque: 50 },
        { nome: "Açaí Zero Açúcar", estoque: 30 },
        { nome: "Cupuaçu", estoque: 40 }
    ];

    // 2. RECHEIOS (Grátis ou Parte do mix)
    const recheiosDB = [
        { nome: "Leite em Pó", estoque: 100 },
        { nome: "Paçoca", estoque: 100 },
        { nome: "Granola", estoque: 100 },
        { nome: "Amendoim", estoque: 80 },
        { nome: "Leite Condensado", estoque: 100 },
        { nome: "Calda de Chocolate", estoque: 50 },
        { nome: "Banana Picada", estoque: 40 }
    ];

    // 3. ADICIONAIS (Pagos - Opcional, verifique se seu sistema cobra)
    const adicionaisDB = [
        { nome: "Nutella Extra", estoque: 20, preco: 5.00 },
        { nome: "Morango Picado", estoque: 30, preco: 3.00 },
        { nome: "Kit Kat", estoque: 40, preco: 4.00 },
        { nome: "Ovomaltine", estoque: 50, preco: 2.50 }
    ];

    try {
        // Função auxiliar para adicionar
        const addLote = async (lista, colecao) => {
            for (const item of lista) {
                // Cria um ID bonitinho baseado no nome (ex: acai-tradicional)
                const id = item.nome.toLowerCase().replace(/ /g, "-").replace(/[^\w-]/g, "");
                await setDoc(doc(db, colecao, id), item);
                console.log(`Adicionado: ${item.nome} em ${colecao}`);
            }
        };

        await addLote(sabores, "sabores");
        await addLote(recheios, "recheios");
        await addLote(adicionais, "adicionais");

        alert("✅ Banco de dados preenchido com sucesso! Agora atualize a página.");
        
    } catch (error) {
        console.error("Erro ao popular:", error);
        alert("Erro ao popular banco (veja o console).");
    }
}