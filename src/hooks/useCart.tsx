import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { isConstructorDeclaration } from 'typescript';
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
      const { data: product } = await api.get(`/products/${productId}`);
      const { data: stock } = await api.get(`/stock/${productId}`);

      const hasInCart = cart.filter(prod => prod.id === productId)[0];
      const quantityInStock = hasInCart === undefined ? stock.amount : stock.amount - hasInCart.amount;

      if (quantityInStock >= 1) {
        const newCart =
          hasInCart !== undefined
            ? cart.map(i => (i.id === productId ? { ...i, amount: i.amount + 1 } : i))
            : [...cart, { ...product, amount: 1 }];

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch (error) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (cart.some(prod => prod.id === productId)) {
        const newCart = cart.filter(product => product.id !== productId);

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else {
        toast.error('Erro na remoção do produto');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({ productId, amount }: UpdateProductAmount) => {
    try {
      if (amount >= 1) {
        const { data: stockItem } = await api.get(`/stock/${productId}`);

        if (stockItem.amount - amount >= 0) {
          const newCart = cart.map(i => (i.id === productId ? { ...i, amount: amount } : i));

          setCart(newCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider value={{ cart, addProduct, removeProduct, updateProductAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
