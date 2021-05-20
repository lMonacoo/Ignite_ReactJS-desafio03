import { createContext, ReactNode, useContext, useState } from 'react';
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

  const [stock, setStock] = useState<Stock[]>(() => {
    const storagedStock = localStorage.getItem('@RocketShoes:stock');

    if (storagedStock) {
      return JSON.parse(storagedStock);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: product } = await api.get(`/products/${productId}`);

      const hasInStock = stock.filter(item => item.id === productId)[0];
      const hasInCart = cart.filter(prod => prod.id === productId);

      const stockProduct =
        hasInStock !== undefined
          ? hasInStock
          : await api.get(`/stock/${productId}`).then(response => response.data);

      if (stockProduct.amount > 1) {
        const newStock = hasInStock
          ? stock.map(i => (i.id === productId ? { ...i, amount: i.amount - 1 } : i))
          : [...stock, { ...stockProduct, amount: stockProduct.amount - 1 }];

        const newCart =
          hasInCart.length !== 0
            ? cart.map(i => (i.id === productId ? { ...i, amount: i.amount + 1 } : i))
            : [...cart, { ...product, amount: 1 }];

        setStock(newStock);
        setCart(newCart);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        localStorage.setItem('@RocketShoes:stock', JSON.stringify(newStock));
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
        const newStock = stock.filter(product => product.id !== productId);

        setCart(newCart);
        setStock(newStock);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        localStorage.setItem('@RocketShoes:stock', JSON.stringify(newStock));
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
        const stockRemain = stock.filter(i => i.id === productId)[0];

        const productAltered = cart.filter(i => i.id === productId)[0];
        const operator = amount < productAltered.amount ? 'decrease' : 'increase';

        if ((operator === 'increase' && stockRemain.amount >= 1) || (operator==='decrease' && stockRemain.amount >=0)) {
          const newStock = stock.map(i =>
            i.id === productId ? { ...i, amount: operator === 'decrease' ? i.amount + 1 : i.amount - 1 } : i
          );

          const newCart = cart.map(i => (i.id === productId ? { ...i, amount: amount } : i));

          setStock(newStock);
          setCart(newCart);

          localStorage.setItem('@RocketShoes:stock', JSON.stringify(newStock));
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
