import { useState } from 'react';
import Ui_Link from '../../components/shared/Link'
import Ui_Modal from '../../components/shared/Modal'
import { ShippingTestPage } from './ShippingTestPage';

const sizes = ["xs", "sm", "md", "lg", "xl", "2xl"];
const variants = ["primary", "secondary", "outline", "underline", "default"];

function UiPage() {
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [showShippingTest, setShowShippingTest] = useState(false);

  const modalExamples = [
    {
      key: 'sm',
      label: 'Small Modal',
      props: {
        size: 'sm' as const,
        title: 'Small Modal',
        description: 'This is a small modal.',
        actions: (
          <>
            <button
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
              onClick={() => setOpenModal(null)}
            >
              Close
            </button>
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setOpenModal(null)}
            >
              Confirm
            </button>
          </>
        ),
        children: <p>Content for small modal.</p>,
      },
    },
    {
      key: 'md',
      label: 'Medium Modal (No Actions)',
      props: {
        size: 'md' as const,
        title: 'Medium Modal',
        description: 'This modal has no actions.',
        children: <p>Content for medium modal.</p>,
      },
    },
    {
      key: 'lg',
      label: 'Large Modal (No Title)',
      props: {
        size: 'lg' as const,
        description: 'This modal has no title.',
        actions: (
          <button
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
            onClick={() => setOpenModal(null)}
          >
            Close
          </button>
        ),
        children: <p>Content for large modal.</p>,
      },
    },
    {
      key: 'xl',
      label: 'Extra Large Modal (No Description)',
      props: {
        size: 'xl' as const,
        title: 'Extra Large Modal',
        actions: (
          <button
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
            onClick={() => setOpenModal(null)}
          >
            Close
          </button>
        ),
        children: <p>Content for extra large modal.</p>,
      },
    },
    {
      key: '2xl',
      label: '2xl Extra Large Modal (No Description)',
      props: {
        size: '2xl' as const,
        title: 'Extra Large Modal',
        actions: (
          <button
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
            onClick={() => setOpenModal(null)}
          >
            Close
          </button>
        ),
        children: <p>Content for extra large modal.</p>,
      },
    },
    {
      key: '3xl',
      label: ' 3xl Extra Large Modal (No Description)',
      props: {
        size: '3xl' as const,
        title: 'Extra Large Modal',
        actions: (
          <button
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
            onClick={() => setOpenModal(null)}
          >
            Close
          </button>
        ),
        children: <p>Content for extra large modal.</p>,
      },
    },
    {
      key: '4xl',
      label: ' 4xl Extra Large Modal (No Description)',
      props: {
        size: '4xl' as const,
        title: 'Extra Large Modal',
        actions: (
          <button
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
            onClick={() => setOpenModal(null)}
          >
            Close
          </button>
        ),
        children: <p>Content for extra large modal.</p>,
      },
    },
    {
      key: '5xl',
      label: ' 5xl Extra Large Modal (No Description)',
      props: {
        size: '5xl' as const,
        title: 'Extra Large Modal',
        actions: (
          <button
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
            onClick={() => setOpenModal(null)}
          >
            Close
          </button>
        ),
        children: <p>Content for extra large modal.</p>,
      },
    },
  ];

  return (
    <div className="mt-10 px-4">
      {showShippingTest ? (
        <div>
          <button
            onClick={() => setShowShippingTest(false)}
            className="mb-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ← Back to UI Components
          </button>
          <ShippingTestPage />
        </div>
      ) : (
        <>
          <div className="mb-8">
            <button
              onClick={() => setShowShippingTest(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              🚚 Test Shipping API
            </button>
          </div>
          <h1 className="text-2xl font-bold mb-8">Ui_Link Component Preview</h1>
      <div className="space-y-4">
        {variants.map((variant) => (
          <div key={variant} className="border-2 shadow-sm rounded-lg p-8">
            <h2 className="text-xl font-semibold mb-4 capitalize">Variant: {variant}</h2>
            <div className="flex flex-wrap gap-6 items-end">
              {sizes.map((size) => (
                <div key={size} className="flex flex-col items-center">
                  <Ui_Link
                    title={`${variant} / ${size}`}
                    url="#"
                    variant={variant as any}
                    size={size as any}
                  />
                  <span className="mt-2 text-md text-gray-500">{size}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h1 className="text-2xl font-bold mt-16 mb-8">Ui_Modal Component Preview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modalExamples.map((modal) => (
          <div key={modal.key} className="border rounded-lg p-6 shadow-sm flex flex-col items-start">
            <span className="font-semibold mb-2">{modal.label}</span>
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => setOpenModal(modal.key)}
            >
              Open Modal
            </button>
            <Ui_Modal
            
              open={openModal === modal.key}
              onClose={() => setOpenModal(null)}
              {...modal.props}
            />
          </div>
        ))}
      </div>
        </>
      )}
    </div>
  )
}

export default UiPage