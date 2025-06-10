import dayjs from 'dayjs';
import React, { useState, useEffect, useRef } from 'react';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { toast } from "react-toastify";
import '../styles/Global.css';
import '../styles/Calendar.css';
import { Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import { IoMdClose } from "react-icons/io";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [produtos, setProdutos] = useState([]);  // precisa ser array
  const [selectedTipo, setSelectedTipo] = useState(null);
  const [selectedProdutos, setSelectedProdutos] = useState({});
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [isModified, setIsModified] = useState(false);

  const h3Refs = useRef({});
  const tiposProdutos = ["Arroz", "Feijão", "Massa", "Carne", "Acompanhamento", "Salada"];

  // Carregar produtos — corrigido para pegar só o array de produtos dentro de response.data.data
  useEffect(() => {
    fetch('http://localhost:8800/produtos')
      .then((res) => res.json())
      .then((data) => {
        // Se paginado, pode ser data.data, se não, use só data
        if (data.data && Array.isArray(data.data)) {
          setProdutos(data.data);
        } else if (Array.isArray(data)) {
          setProdutos(data);
        } else {
          console.error('Formato inesperado do retorno dos produtos:', data);
          setProdutos([]);
        }
      })
      .catch((err) => console.error('Erro ao carregar produtos:', err));
  }, []);

  useEffect(() => {
    const dataAtual = currentDate.format('YYYY-MM-DD');

    fetch(`http://localhost:8800/cardapio?data=${dataAtual}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          const agrupado = {};
          data.forEach((produto) => {
            const tipo = produto.pro_tipo;
            if (!agrupado[tipo]) {
              agrupado[tipo] = [];
            }
            agrupado[tipo].push(produto);
          });
          setSelectedProdutos(agrupado);
        } else {
          setSelectedProdutos({});
        }
        setIsModified(false);
      })
      .catch((err) => {
        console.error('Erro ao carregar cardápio:', err);
        setSelectedProdutos({});
        setIsModified(false);
      });
  }, [currentDate]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isModified) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isModified]);

  const saveCardapio = () => {
    const dataAtual = currentDate.format('YYYY-MM-DD');

    const tiposFaltando = tiposProdutos.filter(tipo => !selectedProdutos[tipo] || selectedProdutos[tipo].length === 0);
    if (tiposFaltando.length > 0) {
      toast.error(`Preencha todos os campos antes de salvar o cardápio`, { position: "top-right" });
      return;
    }

    const produtosParaSalvar = [];
    Object.keys(selectedProdutos).forEach(tipo => {
      selectedProdutos[tipo].forEach(produto => {
        produtosParaSalvar.push({ pro_id: produto.pro_id, pro_tipo: tipo });
      });
    });

    fetch('http://localhost:8800/cardapio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: dataAtual,
        produtos: produtosParaSalvar
      })
    })
      .then(res => res.json())
      .then(data => {
        toast.success("Cardápio salvo com sucesso!", { position: "top-right" });
      })
      .catch(err => {
        console.error("Erro ao salvar cardápio:", err);
        toast.error("Erro ao salvar cardápio");
      });
  };

  const printCardapio = () => {
    const data = currentDate.format('DD/MM/YYYY');

    const getProdutosPorTipo = (tipo) => {
      const lista = selectedProdutos[tipo] || [];
      return lista.map((p) => p.pro_nome).join("\n");
    };

    const cardapioTexto = `
Bom dia, cardápio do dia(${data}) 😁 🍴

*ESTAMOS ENTREGANDO NORMALMENTE! TAXA DE ENTREGA É R$3,00*

*Marmitex com uma carne R$20,00 e com duas carnes R$22,00*

- *Escolha uma opção de:*
${getProdutosPorTipo("Arroz") || "nenhum arroz disponível para hoje"}

- *Escolha uma opção de:*
${getProdutosPorTipo("Feijão") || "nenhum feijão disponível para hoje"}

- *Carnes* *1 ou 2 opções:*
${getProdutosPorTipo("Carne") || "nenhuma carne disponível para hoje"}

- *Massas:* *1 opção:*
${getProdutosPorTipo("Massa") || "nenhuma massa disponível para hoje"}

- *Acompanhamentos:* *1 opção:*
${getProdutosPorTipo("Acompanhamento") || "nenhum acompanhamento disponível para hoje"}

- *Salada:* *1 ou 2 opções:*
${getProdutosPorTipo("Salada") || "nenhuma salada disponível para hoje"}

*POR FAVOR*: Ao finalizar seu pedido peço para que coloque junto seu *nome e horário para retirada ou endereço de entrega e forma de pagamento.* 😉

*Da Lúcia Restaurante* agradece seu pedido, bom apetite!!
    `.trim();

    navigator.clipboard.writeText(cardapioTexto)
      .then(() => toast.success("Cardápio copiado para área de transferência!", { position: "top-right" }))
      .catch((err) => toast.error("Cardápio gerado, mas falha ao copiar: " + err, { position: "top-right" }));
  };

  const showAddMenu = (tipo) => {
    const h3Element = h3Refs.current[tipo];
    if (h3Element) {
      const rect = h3Element.getBoundingClientRect();
      setModalPosition({
        top: rect.top + window.scrollY,
        left: rect.right + 10 + window.scrollX,
      });
    }
    setSelectedTipo(tipo);
  };

  const addProductToMenu = (produto) => {
    setSelectedProdutos(prev => ({
      ...prev,
      [selectedTipo]: [...(prev[selectedTipo] || []), produto]
    }));
    setIsModified(true);
  };

  const removeProductFromMenu = (tipo, index) => {
    setSelectedProdutos(prev => {
      const updatedList = [...(prev[tipo] || [])];
      updatedList.splice(index, 1);
      return {
        ...prev,
        [tipo]: updatedList,
      };
    });
    setIsModified(true);
  };

  return (
    <main>
      <div className="header-product-list">
        <h1 className='title'>Cardápio Diário</h1>
        <div className="header-product-list-buttons">
          <button className="btn-add" onClick={saveCardapio}>Salvar</button>
          <button className="btn-add" onClick={printCardapio}>Gerar Cardápio</button>
        </div>
      </div>
      <div className="container">
        <div className="calendar-container">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DateCalendar currentDate={currentDate} onChange={(newValue) => setCurrentDate(newValue)} />
          </LocalizationProvider>
        </div>

        <div className="product-list">
          <h2 className='day-header'>Mantimentos para {currentDate.format('DD/MM/YYYY')}</h2>
          <ul className="product-list-ul">
            {tiposProdutos.map((tipo) => (
              <li key={tipo} className="product-list-li">
                <h3 ref={(el) => h3Refs.current[tipo] = el}>{tipo}</h3>
                <ul>
                  {(selectedProdutos[tipo] || []).map((produto, index) => (
                    <li key={index} className="product-list-li-decoration">
                      {produto.pro_nome}
                      <button className="calendar-remove-btn" onClick={() => removeProductFromMenu(tipo, index)}>-</button>
                    </li>
                  ))}
                </ul>
                <button className="calendar-add-btn" onClick={() => showAddMenu(tipo)}>Adicionar +</button>
              </li>
            ))}
          </ul>
        </div >
      </div >

      <Dialog open={!!selectedTipo} onClose={() => setSelectedTipo(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Adicionar produto para {selectedTipo}
          <IconButton
            aria-label="close"
            onClick={() => setSelectedTipo(null)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <IoMdClose />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          <ul className="product-list-ul">
            {produtos
              .filter(p => p.pro_tipo === selectedTipo)
              .map((produto) => (
                <li key={produto.pro_id} className="product-list-li-decoration" style={{ cursor: 'pointer' }} onClick={() => addProductToMenu(produto)}>
                  {produto.pro_nome}
                </li>
              ))}
          </ul>
        </DialogContent>
      </Dialog>
    </main>
  );
}
