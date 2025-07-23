// /app/(main)/shop/page.tsx

"use client";

import { useState } from "react";
import ServiceManager from "@/components/admin/ServiceManager";
import StylistManager from "@/components/admin/StylistManager";
import ProductManager from "@/components/admin/ProductManager";
import { useSession } from "next-auth/react";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { BuildingStorefrontIcon, SparklesIcon, UserGroupIcon } from "@heroicons/react/24/outline";

type ShopTab = "products" | "services" | "stylists";

export default function StoreManagementPage() {
  const { data: session } = useSession();

  const canReadProducts = session && hasPermission(session.user.role.permissions, PERMISSIONS.PRODUCTS_READ);
  const canReadServices = session && hasPermission(session.user.role.permissions, PERMISSIONS.SERVICES_READ);
  const canReadStylists = session && hasPermission(session.user.role.permissions, PERMISSIONS.STYLISTS_READ);

  const availableTabs: { id: ShopTab; label: string; icon: React.ElementType, show: boolean }[] = [
    { id: "products", label: "Products", icon: BuildingStorefrontIcon, show: canReadProducts ?? false },
    { id: "services", label: "Services", icon: SparklesIcon, show: canReadServices ?? false },
    { id: "stylists", label: "Stylists", icon: UserGroupIcon, show: canReadStylists ?? false },
  ];

  const visibleTabs = availableTabs.filter((tab) => tab.show);
  const [activeTab, setActiveTab] = useState<ShopTab | null>(visibleTabs.length > 0 ? visibleTabs[0].id : null);

  const renderContent = () => {
    if (!activeTab) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100 p-8">
            <div className="text-center bg-white p-12 rounded-lg shadow-sm">
                <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
                <p className="text-gray-500 mt-3 max-w-md mx-auto">
                    You do not have the necessary permissions to manage any of the shop sections. Please contact an administrator if you believe this is an error.
                </p>
            </div>
        </div>
      );
    }

    switch (activeTab) {
      case "products":
        return canReadProducts ? <ProductManager /> : null;
      case "services":
        return canReadServices ? <ServiceManager /> : null;
      case "stylists":
        return canReadStylists ? <StylistManager /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shop Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage products, services, and stylists.</p>
          </div>
          
          {/* Tab Navigation */}
          {visibleTabs.length > 0 && (
              <div className="flex bg-gray-100 rounded-lg p-1">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      activeTab === tab.id
                        ? "bg-indigo-600 text-white shadow"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    {tab.label}
                  </button>
                ))}
              </div>
          )}
        </div>
      </div>

      {/* Main Content Area: Fills remaining vertical space and handles overflow */}
      <div className="flex-1 overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}