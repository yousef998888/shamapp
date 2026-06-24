#!/usr/bin/env node

// test-shipping.js
// Test script for the shipping service integration

const { ShippingService } = require('./lib/shippingService');

async function testShippingService() {
  console.log('🚚 Testing Shipping Service Integration\n');

  try {
    // Test 1: Configuration validation
    console.log('1. Testing Configuration Validation...');
    const configStatus = ShippingService.getConfigStatus();
    console.log('   Configuration Status:', configStatus);
    
    if (!configStatus.configured) {
      console.log('   ⚠️  Configuration issues found:');
      configStatus.errors.forEach(error => console.log(`      - ${error}`));
      console.log('\n   Please set the required environment variables:');
      console.log('   - GUBA_API_TOKEN');
      console.log('   - GUBA_API_BASE_URL (optional, defaults to https://guba-sy.com/api)');
    } else {
      console.log('   ✅ Configuration is valid\n');
    }

    // Test 2: Health check (ping)
    console.log('2. Testing API Health Check...');
    try {
      const pingResponse = await ShippingService.ping();
      console.log('   ✅ Ping successful:', pingResponse.message);
    } catch (error) {
      console.log('   ❌ Ping failed:', error.message);
      if (error.statusCode === 500 && error.message.includes('token not configured')) {
        console.log('   This is expected when GUBA_API_TOKEN is not set');
      }
    }

    // Test 3: Get available weight classes
    console.log('\n3. Testing Weight Classes...');
    const weightClasses = ShippingService.getWeightClasses();
    console.log('   Available weight classes:');
    Object.entries(weightClasses).forEach(([key, value]) => {
      console.log(`      ${key}: ${value.min}-${value.max} ${value.unit}`);
    });

    // Test 4: Get status mappings
    console.log('\n4. Testing Status Mappings...');
    const statusMappings = ShippingService.getStatusMappings();
    console.log('   Available statuses:', Object.keys(statusMappings).join(', '));

    // Test 5: Get cities (with fallback if API unavailable)
    console.log('\n5. Testing Cities Retrieval...');
    try {
      const citiesResponse = await ShippingService.getCities();
      if (citiesResponse.success) {
        console.log(`   ✅ Retrieved ${citiesResponse.data.length} cities`);
        console.log('   Sample cities:');
        citiesResponse.data.slice(0, 3).forEach(city => {
          console.log(`      - ${city.name} (${city.category})`);
        });
      }
    } catch (error) {
      console.log('   ❌ Cities retrieval failed:', error.message);
    }

    // Test 6: Pricing estimation (will fail without valid API token)
    console.log('\n6. Testing Pricing Estimation...');
    try {
      const pricingData = {
        source: 'Damascus',
        destination: 'Aleppo',
        weight_class: 'medium'
      };
      
      const pricingResponse = await ShippingService.getPricing(pricingData);
      console.log('   ✅ Pricing estimation successful');
      console.log(`   Estimated price: ${pricingResponse.data.estimated_price} ${pricingResponse.data.currency}`);
    } catch (error) {
      console.log('   ❌ Pricing estimation failed:', error.message);
      if (error.statusCode === 500 && error.message.includes('token not configured')) {
        console.log('   This is expected when GUBA_API_TOKEN is not set');
      }
    }

    // Test 7: Order creation (will fail without valid API token)
    console.log('\n7. Testing Order Creation...');
    try {
      const orderData = {
        source: 'Damascus',
        destination: 'Aleppo',
        sender_name: 'Test Sender',
        sender_phone: '+963-11-123-4567',
        sender_address: '123 Test St, Damascus',
        receiver_name: 'Test Receiver',
        receiver_phone: '+963-21-987-6543',
        receiver_address: '456 Test Ave, Aleppo',
        products_count: 1,
        weight_class: 'light',
        pickup_date: '2024-01-15',
        products: [
          { name: 'Test Product', price: 25.99, quantity: 1 }
        ]
      };
      
      const orderResponse = await ShippingService.createOrder(orderData);
      console.log('   ✅ Order creation successful');
      console.log(`   Order code: ${orderResponse.data.order_code}`);
    } catch (error) {
      console.log('   ❌ Order creation failed:', error.message);
      if (error.statusCode === 500 && error.message.includes('token not configured')) {
        console.log('   This is expected when GUBA_API_TOKEN is not set');
      }
    }

    console.log('\n🎯 Test Summary:');
    if (configStatus.configured) {
      console.log('   ✅ Configuration is valid');
      console.log('   ✅ Ready for API integration');
      console.log('\n   To test with real API calls, set GUBA_API_TOKEN environment variable');
    } else {
      console.log('   ⚠️  Configuration issues detected');
      console.log('   ❌ API integration not ready');
      console.log('\n   Please fix configuration issues before proceeding');
    }

  } catch (error) {
    console.error('\n💥 Test failed with unexpected error:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testShippingService()
    .then(() => {
      console.log('\n✨ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testShippingService }; 