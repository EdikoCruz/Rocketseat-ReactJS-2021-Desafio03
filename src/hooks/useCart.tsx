import { createContext, ReactNode, SetStateAction, useContext, useState } from 'react';
import { toast } from 'react-toastify';
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


  function setAndCacheCart(f: (arg0: Product[]) => Product[]) {
    setCart(cart => {
      const newCart = f(cart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      return newCart;
    })
  }

  const addProduct = async (productId: number) => {
    try {
      const product = await api.get(`products/${productId}`).then(response => response.data);
      const stock = await api.get(`stock/${productId}`).then(response => response.data);
      
      const productInCart = cart.find(p => p.id === product.id);

      if (!productInCart) {
        setAndCacheCart(cart => [...cart, {...product, amount: 1}]);
        return
      }

      if (productInCart.amount + 1 > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      setAndCacheCart(cart => cart.map(p => {
        console.log(p, product)
        if (p.id === product.id) {
          return {...p, amount: (p.amount || 0) + 1}
        }
        
        return p;
      }))
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = cart.find(p => p.id === productId);

      if (!productInCart) {
        throw new Error()
      }

      setAndCacheCart(cart => cart.filter(p => p.id !== productId))
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stock = await api.get(`stock/${productId}`).then(response => response.data);

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      setAndCacheCart(cart => cart.map(p => {
        if (p.id !== productId) {
          return p;
        }

        return {...p, amount: amount}
      }))
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
