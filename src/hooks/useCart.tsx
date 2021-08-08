import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { idText } from 'typescript';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
     const storagedCart = localStorage.getItem('@RocketShoes:cart');

     if (storagedCart) {
       return JSON.parse(storagedCart);
     }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      //verifica se existe
      const productExists = updatedCart.find(product => product.id === productId);
      //rota do estoque
      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount;
      //se o produto existe pego o amount, se não ele é 0
      const currentAmount = productExists ? productExists.amount: 0;
      
      const amount = currentAmount + 1;

      //se a quantidade desejada for maior que o estoque
      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return;//para nao continuar se falhar
      }

      //se o produto existe ele atualiza no estoque
      if(productExists){
        productExists.amount = amount;
      }else{
        //se for produto novo, busca na api e adiciona o amount 1
        const product =await api.get(`/products/${productId}`);

        const newProduct ={
          ...product.data,
          amount: 1
        }
        //atualiza a retirada do novo pproduto
        updatedCart.push(newProduct);
        
      }
      //perpetuar as alterações
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      //verificar se o produto existe
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId)
      // retorna -1 se não encontrar então se ele encontrar:
      if(productIndex >= 0){
        //splice pode remover elementos do array(apagar o index que encontrei, e apagar produto)
        updatedCart.splice(productIndex,1);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))

      }else{
        //vai direto para o catch
        throw Error();

      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      //se a quantidade desejada for menor que o produto só sai
      if(amount <= 0){
        return;
      }
      const stock =await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      // se a quantidade pedida for maior que o estoque
      if(amount > stockAmount){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      const productExists = updatedCart.find(product => product.id === productId);

      //verificar se existe
      if(productExists){
        productExists.amount = amount;
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))

      }else{
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
