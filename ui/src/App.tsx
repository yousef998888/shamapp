import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import './i18n'; // Initialize i18n
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout/Layout';
import { HomePage } from './pages/HomePage';
import { CategoryPage } from './pages/CategoryPage';
import { ProductPage } from './pages/ProductPage';
import { SignUpForm } from './components/Auth/SignUpForm';
import { LoginForm } from './components/Auth/LoginForm';
import { CreateProductForm } from './components/Products/CreateProductForm';
import UiPage from './pages/test-ui/UiPage';
import BuyingPage from './pages/UserDashboard/BuyingPage';
import ReviewsPage from './pages/UserDashboard/ReviewsPage';
import SavedSearchesPage from './pages/UserDashboard/SavedSearchesPage';
import SellingPage from './pages/UserDashboard/Sellings/SellingPage';
import WatchlistPage from './pages/UserDashboard/WatchlistPage';
import DashboardPage from './pages/UserDashboard/DashboardPage';
import CreateSellingPage from './pages/UserDashboard/Sellings/CreateSellingPage';
import UserProfilePage from './pages/UserProfilePage';
import { useDirection } from './hooks/useDirection';
import { FavoritePage } from './pages/FavoritePage';
import { SearchResultsPage } from './pages/SearchResultsPage';
import { EditSellingPage } from './pages/UserDashboard/Sellings/EditSellingPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage } from './pages/OrdersPage';
import { ChatsPage } from './pages/ChatsPage';
import ChatsDashboardPage from './pages/UserDashboard/ChatsDashboardPage';

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <h1 className="text-xl font-semibold text-gray-900 mb-4">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-4">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  // Initialize direction based on current language
  useDirection();

  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/profile" element={<UserProfilePage/>} />
              
              <Route path="/test-ui" element={<UiPage />} />
              <Route path="/signup" element={<SignUpForm />} />
              <Route path="/login" element={<LoginForm />} />
              <Route path="/sell" element={<CreateProductForm />} />
              <Route path="/category/:slug" element={<CategoryPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/product/:id/edit" element={<EditSellingPage />} />
              <Route path="/checkout/:id" element={<CheckoutPage />} />
              <Route path="/orders" element={<OrdersPage />} />

              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="/favorites" element={<FavoritePage />} />
              
              {/* User Dashboard Routes */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/dashboard/buying" element={<BuyingPage />} />
              <Route path="/dashboard/reviews" element={<ReviewsPage />} />
              <Route path="/dashboard/saved-searches" element={<SavedSearchesPage />} />
              <Route path="/dashboard/selling" element={<SellingPage />} />
              <Route path="/dashboard/selling/create" element={<CreateSellingPage />} />
              <Route path="/dashboard/selling/edit/:id" element={<EditSellingPage />} />
              <Route path="/dashboard/chats" element={<ChatsDashboardPage />} />
              <Route path="/dashboard/chats/:chatId" element={<ChatsDashboardPage />} />
              <Route path="/dashboard/watchlist" element={<WatchlistPage />} />
            </Routes>
          </Layout>
          <Toaster position="top-right" />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;