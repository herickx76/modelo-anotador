// ============================================================
// LÓGICA DO PAINEL ADMINISTRATIVO (admin.js) - VERSÃO ATUALIZADA
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// --- CONFIGURAÇÃO DO FIREBASE (Mantida do seu arquivo original) ---
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
// 1. SEGURANÇA E INICIALIZAÇÃO
// ============================================================

// Verifica se o usuário logou pela senha no index.html
// (Certifique-se de ter implementado a lógica de senha no index.html/script.js conforme orientado)
if (!sessionStorage.getItem('adminLogado')) {
    alert("Acesso restrito! Faça login na página inicial.");
    window.location.href = "index.html";
}

// Inicia na aba de pedidos ou financeiro
document.addEventListener("DOMContentLoaded", () => {
    mudarAbaAdmin('financeiro'); // Começa no financeiro para ver os dados
    monitorarPedidos(); // Já começa a ouvir os pedidos
});

window.voltarLoja = function() {
    sessionStorage.removeItem('adminLogado');
    window.location.href = "index.html";
}

// ============================================================
// 2. NAVEGAÇÃO ENTRE ABAS
// ============================================================
window.mudarAbaAdmin = function(abaId) {
    // Esconde todas as abas
    document.querySelectorAll('.admin-page').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active'));

    // Mostra a aba desejada
    const abaAlvo = document.getElementById('admin-' + abaId);
    if (abaAlvo) {
        abaAlvo.style.display = 'block';
        // Acha o botão correspondente e ativa (logica simples baseada no onclick)
        const btns = document.querySelectorAll('.admin-tab');
        btns.forEach(btn => {
            if(btn.getAttribute('onclick').includes(abaId)) btn.classList.add('active');
        });
    }

    // Carrega dados específicos da aba
    if (abaId === 'financeiro') carregarFinanceiro();
    if (abaId === 'estoque') carregarEstoqueVisual();
    if (abaId === 'promocional') listarCuponsAdmin();
}

// ============================================================
// 3. FINANCEIRO (Diário, Mensal, Anual)
// ============================================================
async function carregarFinanceiro() {
    // Feedback visual
    document.getElementById('fat-diario').innerText = "...";
    document.getElementById('fat-mensal').innerText = "...";

    try {
        const pedidosSnap = await getDocs(collection(db, "pedidos"));
        
        let diario = 0;
        let mensal = 0;
        let anual = 0;
        let qtdMes = 0;

        const agora = new Date();
        const diaAtual = agora.getDate();
        const mesAtual = agora.getMonth(); // 0 a 11
        const anoAtual = agora.getFullYear();

        pedidosSnap.forEach(doc => {
            const p = doc.data();
            // Verifica se o pedido é válido (não cancelado)
            // Se você não tiver campo status, pode remover a verificação "&& p.status !== 'cancelado'"
            if (p.data) {
                const dataPedido = new Date(p.data);
                
                // Checagem de Ano
                if (dataPedido.getFullYear() === anoAtual) {
                    anual += (p.total || 0);
                    
                    // Checagem de Mês
                    if (dataPedido.getMonth() === mesAtual) {
                        mensal += (p.total || 0);
                        qtdMes++;

                        // Checagem de Dia
                        if (dataPedido.getDate() === diaAtual) {
                            diario += (p.total || 0);
                        }
                    }
                }
            }
        });

        // Formatação moeda
        const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        document.getElementById('fat-diario').innerText = fmt(diario);
        document.getElementById('fat-mensal').innerText = fmt(mensal);
        document.getElementById('fat-anual').innerText = fmt(anual);
        
        const elQtd = document.getElementById('total-pedidos-mes');
        if(elQtd) elQtd.innerText = qtdMes;

    } catch (error) {
        console.error("Erro financeiro:", error);
    }
}

// ============================================================
// 4. ESTOQUE VISUAL (Botões + e -)
// ============================================================
async function carregarEstoqueVisual() {
    const div = document.getElementById('lista-estoque-visual');
    if(!div) return;
    
    div.innerHTML = "<p>Carregando itens...</p>";

    // Coleções que formam o açaí
    const colecoes = ["sabores", "recheios", "adicionais"];
    let htmlFinal = "";

    for (const colName of colecoes) {
        const snap = await getDocs(collection(db, colName));
        
        // Título da seção (ex: Sabores)
        htmlFinal += `<h4 style="margin-top:15px; text-transform:capitalize; border-bottom:1px solid #ddd; padding-bottom:5px;">${colName}</h4>`;
        
        if (snap.empty) {
            htmlFinal += `<p style="font-size:0.8rem; color:#999">Nenhum item cadastrado.</p>`;
        } else {
            snap.forEach(docSnap => {
                const item = docSnap.data();
                const id = docSnap.id;
                // Se não tem campo estoque definido, assume 50
                const estoqueAtual = (item.estoque !== undefined) ? item.estoque : 50;
                
                // Define cor se estiver zerado
                const corEstoque = estoqueAtual > 0 ? '#333' : '#e74c3c';
                const textoEstoque = estoqueAtual > 0 ? estoqueAtual : 'ESGOTADO';

                htmlFinal += `
                <div class="item-row" style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:500;">${item.nome}</span>
                    
                    <div style="display:flex; align-items:center; gap: 8px; background: #f0f0f0; padding: 5px; border-radius: 8px;">
                        <button onclick="alterarEstoque('${colName}', '${id}', -1, ${estoqueAtual})" 
                            style="width:30px; height:30px; border:none; background:#ddd; cursor:pointer; font-weight:bold; border-radius:4px;">-</button>
                        
                        <span id="qtd-${id}" style="min-width:40px; text-align:center; font-weight:bold; color:${corEstoque}">
                            ${textoEstoque}
                        </span>

                        <button onclick="alterarEstoque('${colName}', '${id}', 1, ${estoqueAtual})" 
                            style="width:30px; height:30px; border:none; background:#4b0082; color:white; cursor:pointer; font-weight:bold; border-radius:4px;">+</button>
                    </div>
                </div>`;
            });
        }
    }
    div.innerHTML = htmlFinal;
}

// Função global para ser chamada pelo HTML
window.alterarEstoque = async function(colecao, id, delta, atual) {
    const novoValor = atual + delta;
    if (novoValor < 0) return; // Não deixa ficar negativo

    // Atualiza visualmente na hora (UI Otimista)
    const el = document.getElementById(`qtd-${id}`);
    if (el) {
        el.innerText = novoValor > 0 ? novoValor : "ESGOTADO";
        el.style.color = novoValor > 0 ? "#333" : "#e74c3c";
        
        // Atualiza o onclick dos botões para o novo valor atual, para o próximo clique funcionar certo
        // (Isso é um jeito simples, o ideal seria recarregar, mas assim é mais rápido)
        // Como o onclick é string no HTML gerado, o jeito mais seguro é recarregar a lista ou atualizar o atributo
        // Para simplificar e garantir consistência, vamos salvar no banco e recarregar a lista:
    }

    try {
        const ref = doc(db, colecao, id);
        await updateDoc(ref, { estoque: novoValor });
        // Recarrega para atualizar os eventos onclick com o valor novo correto
        carregarEstoqueVisual();
    } catch (e) {
        console.error("Erro ao atualizar estoque", e);
        alert("Erro de conexão ao atualizar estoque.");
    }
}

// ============================================================
// 5. CUPONS (Criação e Listagem Corrigida)
// ============================================================
window.adicionarCupom = async function() {
    const codigoInput = document.getElementById('cupomCodigo');
    const valorInput = document.getElementById('cupomValor');
    
    const codigo = codigoInput.value.trim().toUpperCase();
    const valor = parseFloat(valorInput.value);

    if (!codigo || isNaN(valor)) {
        alert("Preencha o código e o valor do desconto!");
        return;
    }

    try {
        await addDoc(collection(db, "cupons"), { 
            codigo: codigo, 
            valor: valor,
            criadoEm: new Date().toISOString()
        });
        alert(`Cupom ${codigo} criado com sucesso!`);
        
        // Limpa campos
        codigoInput.value = "";
        valorInput.value = "";
        
        // Atualiza lista
        listarCuponsAdmin();
    } catch (e) {
        console.error(e);
        alert("Erro ao criar cupom.");
    }
}

async function listarCuponsAdmin() {
    const div = document.getElementById('lista-cupons');
    if(!div) return;
    
    div.innerHTML = "Carregando...";
    
    try {
        const snap = await getDocs(collection(db, "cupons"));
        div.innerHTML = ""; // Limpa antes de adicionar

        if (snap.empty) {
            div.innerHTML = "<p>Nenhum cupom ativo no momento.</p>";
            return;
        }

        snap.forEach(d => {
            const c = d.data();
            div.innerHTML += `
            <div class="item-row" style="border-left: 4px solid #4b0082;">
                <div>
                    <span style="font-weight:bold; font-size:1.1rem;">${c.codigo}</span>
                    <span style="display:block; font-size:0.9rem; color:#666;">Desconto: ${c.valor}%</span>
                </div>
                <button class="btn-remove-item" onclick="deletarCupom('${d.id}')" style="background:#e74c3c; color:white; padding:5px 10px; border-radius:4px; border:none; cursor:pointer;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>`;
        });
    } catch (e) {
        console.log(e);
        div.innerHTML = "Erro ao carregar cupons.";
    }
}

window.deletarCupom = async function(id) {
    if(confirm("Excluir este cupom?")) {
        await deleteDoc(doc(db, "cupons", id));
        listarCuponsAdmin();
    }
}

// ============================================================
// 6. PEDIDOS (Tempo Real)
// ============================================================
function monitorarPedidos() {
    const divLista = document.getElementById('lista-pedidos-realtime');
    
    // Query ordenando por data (mais recente primeiro se sua string de data permitir, 
    // ou idealmente usando timestamp. Assumindo string ISO ou ordenação simples aqui)
    const q = query(collection(db, "pedidos")); 
    // Se quiser ordenar: const q = query(collection(db, "pedidos"), orderBy("data", "desc"));
    // Nota: orderBy requer índice no Firebase às vezes.

    onSnapshot(q, (snapshot) => {
        divLista.innerHTML = ""; // Limpa lista
        
        let pedidosArray = [];
        snapshot.forEach(doc => {
            pedidosArray.push({ id: doc.id, ...doc.data() });
        });

        // Ordenação manual via JS (mais garantido sem criar indices complexos agora)
        pedidosArray.sort((a, b) => new Date(b.data) - new Date(a.data));

        if (pedidosArray.length === 0) {
            divLista.innerHTML = "<p>Nenhum pedido recebido.</p>";
            return;
        }

        pedidosArray.forEach(p => {
            // Formatar Itens
            let resumoItens = "";
            if(p.itens && p.itens.length > 0) {
                resumoItens = p.itens.map(i => `${i.quantidade}x ${i.nome}`).join(", ");
            } else if (p.resumo) {
                resumoItens = p.resumo; // Caso use campo resumo antigo
            } else {
                // Fallback para estrutura montada
                resumoItens = "Açaí Montado";
            }

            const card = document.createElement('div');
            card.className = "order-card"; // Usar estilo CSS existente
            // Estilo inline básico caso o CSS falte
            card.style.background = "#fff";
            card.style.padding = "15px";
            card.style.marginBottom = "10px";
            card.style.borderRadius = "8px";
            card.style.border = "1px solid #eee";

            card.innerHTML = `
                <div class="order-header" style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <strong>#${p.id.substr(0, 5)}</strong>
                    <span style="font-size:0.85rem; color:#666;">${new Date(p.data).toLocaleString()}</span>
                </div>
                <div class="order-body">
                    <p><b>Cliente:</b> ${p.cliente ? p.cliente.nome : 'Anônimo'}</p>
                    <p><b>Itens:</b> ${resumoItens}</p>
                    <p><b>Total:</b> R$ ${p.total ? p.total.toFixed(2) : '0.00'}</p>
                    <p><b>Pagamento:</b> ${p.pagamento || 'Não inf.'}</p>
                    ${p.troco ? `<p><b>Troco para:</b> ${p.troco}</p>` : ''}
                </div>
                <a href="https://wa.me/55${p.cliente && p.cliente.telefone ? p.cliente.telefone.replace(/\D/g,'') : ''}?text=Olá ${p.cliente ? p.cliente.nome : ''}, seu pedido está sendo preparado!" 
                   target="_blank" style="display:block; text-align:center; background:#25D366; color:white; padding:8px; border-radius:4px; margin-top:10px; text-decoration:none;">
                   <i class="fab fa-whatsapp"></i> Avisar Cliente
                </a>
            `;
            divLista.appendChild(card);
        });
    });
}

// ============================================================
// 🛠️ SCRIPT DE CARGA INICIAL (Rode uma vez e apague depois)
// ============================================================
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

window.popularBancoDeDados = async function() {
    if(!confirm("Isso vai adicionar vários itens ao seu cardápio. Continuar?")) return;
    
    console.log("Iniciando cadastro...");

    // 1. SABORES (Base do Açaí)
    const sabores = [
        { nome: "Açaí Tradicional", estoque: 100 },
        { nome: "Açaí com Morango", estoque: 50 },
        { nome: "Açaí Zero Açúcar", estoque: 30 },
        { nome: "Cupuaçu", estoque: 40 }
    ];

    // 2. RECHEIOS (Grátis ou Parte do mix)
    const recheios = [
        { nome: "Leite em Pó", estoque: 100 },
        { nome: "Paçoca", estoque: 100 },
        { nome: "Granola", estoque: 100 },
        { nome: "Amendoim", estoque: 80 },
        { nome: "Leite Condensado", estoque: 100 },
        { nome: "Calda de Chocolate", estoque: 50 },
        { nome: "Banana Picada", estoque: 40 }
    ];

    // 3. ADICIONAIS (Pagos - Opcional, verifique se seu sistema cobra)
    const adicionais = [
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