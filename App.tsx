import React, { useState, useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import { } from 'chart.js/auto';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Types
interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string;  // Added for product images
  salesData: number[];
  lastUpdated: string;
  description?: string;
}

interface TrendPrediction {
  productId: number;
  productName: string;
  currentTrend: 'rising' | 'falling' | 'stable';
  confidence: number;
  predictedSales: number[];
}

// Main Admin Panel Component
const App: React.FC = () => {
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [trendPredictions, setTrendPredictions] = useState<TrendPrediction[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    stock: 0,
    category: '',
    imageUrl: '',  // Added for new products
    description: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showTrends, setShowTrends] = useState(true);  // Toggle for trends section
  const [socketConnected, setSocketConnected] = useState(false);

  // WebSocket reference
  const ws = useRef<WebSocket | null>(null);
  const [socket, setSocket] = useState<any>(null);
  // App.use(cors());

  // Initialize WebSocket connection (simulated for demo; replace with real backend)
  useEffect(() => {

    // const socket = io("http://localhost:3300/", {
    //   cors: {
    //     origin: "*",
    //   },
    //   transports: ['websocket', 'polling'],
    //   });
    fetch("http://localhost:5173/")
    .then((res) => res.json())
    .then((data) => {
      // Handle the fetched data
      console.log('Fetched data:', data);

      socket.on("connect", () => {
        console.log("Connected to WebSocket server");
        setSocketConnected(true);
      });
    });
    // Simulate WebSocket connection for real-time updates
    const connectWebSocket = () => {
      try {
        // In a real implementation, this would connect to your backend WebSocket
        // e.g., ws.current = new WebSocket('ws://localhost:80/ws');
        setSocketConnected(true);
        console.log('WebSocket connected (simulated)');
        
        // Simulate receiving real-time updates every 3 seconds
        const interval = setInterval(() => {
          if (products.length > 0) {
            const randomProductIndex = Math.floor(Math.random() * products.length);
            const updatedProduct = { ...products[randomProductIndex] };
            
            // Simulate stock changes and sales
            const stockChange = Math.random() > 0.7 ? -1 : 0;
            const salesUpdate = Math.random() > 0.8 ? 1 : 0;
            
            updatedProduct.stock = Math.max(0, updatedProduct.stock + stockChange);
            if (salesUpdate && updatedProduct.stock > 0) {
              updatedProduct.salesData = [
                ...updatedProduct.salesData.slice(1),
                Math.floor(Math.random() * 10) + 1
              ];
            }
            updatedProduct.lastUpdated = new Date().toISOString();
            
            setProducts(prev => prev.map(p => 
              p.id === updatedProduct.id ? updatedProduct : p
            ));
            
            // Recalculate trends after update
            calculateTrendPredictions(products.map(p => p.id === updatedProduct.id ? updatedProduct : p));
          }
        }, 5137);

        return () => clearInterval(interval);
      } catch (error) {
        console.error('WebSocket connection failed:', error);
        setSocketConnected(false);
      }
    };

    connectWebSocket();
    socket.on("disconnect", () => {
      console.log("Disconnected from WebSocket server");
      setSocketConnected(false);
    });

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [products]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Simulate API call to fetch products (replace with axios.get('http://localhost:80/products/'))
        const mockProducts: Product[] = [
          {
            id: 1,
            name: 'Premium Laptop',
            price: 1299.99,
            stock: 45,
            category: 'electronics',
            imageUrl: 'https://picsum.photos/300/200?random=1',  // Placeholder image
            salesData: [12, 15, 18, 22, 25, 28],
            lastUpdated: new Date().toISOString()
          },
          {
            id: 2,
            name: 'Wireless Headphones',
            price: 199.99,
            stock: 120,
            category: 'electronics',
            imageUrl: 'https://picsum.photos/300/200?random=2',
            salesData: [45, 38, 42, 50, 55, 60],
            lastUpdated: new Date().toISOString()
          },
          {
            id: 3,
            name: 'Running Shoes',
            price: 89.99,
            stock: 75,
            category: 'clothing',
            imageUrl: 'https://picsum.photos/300/200?random=3',
            salesData: [30, 25, 28, 32, 35, 40],
            lastUpdated: new Date().toISOString()
          },
          {
            id: 4,
            name: 'Smart Watch',
            price: 349.99,
            stock: 30,
            category: 'electronics',
            imageUrl: 'https://picsum.photos/300/200?random=4',
            salesData: [18, 22, 25, 28, 32, 35],
            lastUpdated: new Date().toISOString()
          },
          {
            id: 5,
            name: 'Yoga Mat',
            price: 49.99,
            stock: 200,
            category: 'sports',
            imageUrl: 'https://picsum.photos/300/200?random=5',
            salesData: [15, 20, 25, 30, 35, 40],
            lastUpdated: new Date().toISOString()
          }
        ];

        setProducts(mockProducts);
        calculateTrendPredictions(mockProducts);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load products:', error);
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Calculate trend predictions (simple linear regression)
  const calculateTrendPredictions = (productsList: Product[]) => {
    const predictions: TrendPrediction[] = productsList.map(product => {
      const sales = product.salesData;
      const recentTrend = sales.slice(-3);
      const previousTrend = sales.length > 6 ? sales.slice(-6, -3) : [0, 0, 0];
      
      const recentAvg = recentTrend.reduce((a, b) => a + b, 0) / recentTrend.length;
      const previousAvg = previousTrend.reduce((a, b) => a + b, 0) / previousTrend.length;
      
      let currentTrend: 'rising' | 'falling' | 'stable' = 'stable';
      let confidence = 0.5;
      
      if (recentAvg > previousAvg * 1.2) {
        currentTrend = 'rising';
        confidence = Math.min(0.95, (recentAvg - previousAvg) / previousAvg);
      } else if (recentAvg < previousAvg * 0.8) {
        currentTrend = 'falling';
        confidence = Math.min(0.95, (previousAvg - recentAvg) / previousAvg);
      }
      
      // Predict next 3 periods using simple linear projection
      const slope = (recentTrend[2] - recentTrend[0]) / 2;
      const predictedSales = [
        Math.round(recentTrend[2] + slope),
        Math.round(recentTrend[2] + slope * 2),
        Math.round(recentTrend[2] + slope * 3)
      ].map(s => Math.max(0, s));

      return {
        productId: product.id,
        productName: product.name,
        currentTrend,
        confidence,
        predictedSales
      };
    });

    setTrendPredictions(predictions);
  };

  // Filter products based on search and category
  const filteredProducts = useMemo(() => 
    products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }), [products, searchTerm, selectedCategory]
  );

  // Filtered trends (sync with products filter)
  const filteredTrends = useMemo(() => 
    trendPredictions.filter(trend => 
      filteredProducts.some(p => p.id === trend.productId)
    ), [trendPredictions, filteredProducts]
  );

  // Handle product actions
  const handleAddProduct = () => {
    if (newProduct.name && newProduct.price > 0) {
      const newProductData: Product = {
        id: Math.max(...products.map(p => p.id), 0) + 1,
        name: newProduct.name,
        price: newProduct.price,
        stock: newProduct.stock || 0,
        category: newProduct.category || 'general',
        imageUrl: newProduct.imageUrl || 'https://picsum.photos/300/200?random=' + Date.now(),  // Random placeholder
        salesData: [0, 0, 0, 0, 0, 0],
        lastUpdated: new Date().toISOString()
      };
      
      const updatedProducts = [...products, newProductData];
      setProducts(updatedProducts);
      calculateTrendPredictions(updatedProducts);
      setNewProduct({ name: '', price: 0, stock: 0, category: '', imageUrl: '', description: '' });
      setIsAdding(false);
      
      // Simulate sending to backend via WebSocket
      console.log('Product added:', newProductData);
    }
  };

  const handleUpdateProduct = () => {
    if (selectedProduct) {
      const updatedProducts = products.map(p => 
        p.id === selectedProduct.id ? selectedProduct : p
      );
      setProducts(updatedProducts);
      calculateTrendPredictions(updatedProducts);
      setIsEditing(false);
      setSelectedProduct(null);
      
      // Simulate sending to backend via WebSocket
      console.log('Product updated:', selectedProduct);
    }
  };

  const handleDeleteProduct = (id: number) => {
    const updatedProducts = products.filter(p => p.id !== id);
    setProducts(updatedProducts);
    calculateTrendPredictions(updatedProducts);
    
    // Simulate sending to backend via WebSocket
    console.log('Product deleted:', id);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsEditing(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (isAdding) {
      setNewProduct(prev => ({ ...prev, [name]: name === 'price' || name === 'stock' ? parseFloat(value) || 0 : value }));
    } else if (isEditing && selectedProduct) {
      setSelectedProduct(prev => {
        if (prev === null) return null;
        return { ...prev, [name]: name === 'price' || name === 'stock' ? parseFloat(value) || 0 : value };
      });
    }
  };

  const handleSave = () => {
    if (isAdding) {
      handleAddProduct();
    } else {
      handleUpdateProduct();
    }
  };

  // Chart data for individual product trends (memoized)
  const getTrendChartData = useMemo(() => (productId: number) => {
    const product = products.find(p => p.id === productId);
    const prediction = trendPredictions.find(p => p.productId === productId);
    
    if (!product || !prediction) return null;

    return {
      labels: ['Week -5', 'Week -4', 'Week -3', 'Week -2', 'Week -1', 'Current', 'Next Week', 'Week +2', 'Week +3'],
      datasets: [
        {
          label: 'Actual Sales',
          data: [...product.salesData, null, null, null],
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1
        },
        {
          label: 'Predicted Sales',
          data: [null, null, null, null, null, null, ...prediction.predictedSales],
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.1,
          borderDash: [5, 5]  // Dashed line for predictions
        }
      ]
    };
  }, [products, trendPredictions]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Sales Trend and Prediction',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      }
    },
  };

  // Loading Spinner Component
  const LoadingSpinner = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
      <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #007bff', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
    </div>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
  <>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .admin-panel { padding: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); min-height: 100vh; }
        header { text-align: center; margin-bottom: 30px; color: #333; }
        header h1 { font-size: 2.5em; margin: 0; background: linear-gradient(45deg, #007bff, #0056b3); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .status { font-weight: bold; padding: 10px; border-radius: 5px; margin-top: 10px; }
        .search-filters { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center; }
        input, select, button { padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; }
        button { background: linear-gradient(45deg, #007bff, #0056b3); color: white; border: none; cursor: pointer; transition: transform 0.2s; }
        button:hover { transform: scale(1.05); }
        .form-section { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .product-card { background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1); transition: transform 0.2s, box-shadow 0.2s; }
        .product-card:hover { transform: translateY(-5px); box-shadow: 0 8px 16px rgba(0,0,0,0.2); }
        .product-image { width: 100%; height: 200px; object-fit: cover; }
        .product-info { padding: 15px; }
        .product-name { font-size: 1.2em; font-weight: bold; margin-bottom: 5px; }
        .product-price { color: #28a745; font-weight: bold; }
        .actions { display: flex; gap: 10px; margin-top: 10px; }
        .actions button { flex: 1; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        th { background: #f8f9fa; }
        tr:nth-child(even) { background: #f2f2f2; }
      `}</style>
      <div className="admin-panel">
        <header>
          <h1>E-commerce Admin Panel</h1>
          <div className={`status ${socketConnected ? 'connected' : 'disconnected'}`} style={{ color: socketConnected ? 'green' : 'red' }}>
            {socketConnected ? 'Real-time Updates Connected' : 'Disconnected from Real-time Updates'}
          </div>
        </header>

        {/* Search and Filters */}
        <div className="search-filters">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            />
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
            <option value="all">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
            <option value="sports">Sports</option>
            <option value="general">General</option>
          </select>
          <button onClick={() => { setIsAdding(true); setIsEditing(false); setSelectedProduct(null); }}>Add New Product</button>
          <button onClick={() => setShowTrends(prev => !prev)}>{showTrends ? 'Hide' : 'Show'} Trends</button>
        </div>

        {/* Add/Edit Product Form */}
        {(isAdding || isEditing) && (
          <div className="form-section">
            <h2>{isAdding ? 'Add New Product' : 'Edit Product'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px',
              maxWidth: '400px' }}>
                <input
                  type="text"
                  name="name"
                  placeholder="Product Name"
                  value={isAdding ? newProduct.name : selectedProduct?.name || ''}
                  onChange={e => isAdding ? setNewProduct({ ...newProduct, name: e.target.value }) : setSelectedProduct(prev => prev ? { ...prev, name: e.target.value } : prev)}
                />
                <input
                  type="text"
                  name="description"
                  placeholder="Product Description"
                  value={isAdding ? newProduct.description : selectedProduct?.description || ''}
                  onChange={e => isAdding ? setNewProduct({ ...newProduct, description: e.target.value }) : setSelectedProduct(prev => prev ? { ...prev, description: e.target.value } : prev)}
                />
                
                <input
                  type="number"
                  name="price"
                  placeholder="Product Price"
                  value={isAdding ? newProduct.price : selectedProduct?.price || ''}
                  onChange={e => isAdding ? setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 }) : setSelectedProduct(prev => prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : prev)}
                />
                <select
                  name="category"
                  value={isAdding ? newProduct.category : selectedProduct?.category || ''}
                  onChange={e => isAdding ? setNewProduct({ ...newProduct, category: e.target.value }) : setSelectedProduct(prev => prev ? { ...prev, category: e.target.value } : prev)}
                >
                  <option value="electronics">Electronics</option>
                  <option value="clothing">Clothing</option>
                  <option value="sports">Sports</option>
                  <option value="general">General</option>
                </select>
                <div className="actions">
                  <button onClick={handleSave}>{isAdding ? 'Add Product' : 'Save Changes'}</button>
                  <button onClick={() => { setIsAdding(false); setIsEditing(false); setSelectedProduct(null); }}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
    </>
  );
}

export default App;