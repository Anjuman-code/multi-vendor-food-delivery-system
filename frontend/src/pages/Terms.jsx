import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Terms = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Terms of Service</h1>
        
        <div className="prose max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-4">
              Welcome to Anfi. These terms and conditions outline the rules and regulations for the use of Anfi's 
              website and services.
            </p>
            <p className="text-gray-600">
              By accessing this website, we assume you accept these terms and conditions. Do not continue to use 
              Anfi if you do not agree to all of the terms stated on this page.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">2. Intellectual Property</h2>
            <p className="text-gray-600 mb-4">
              Unless otherwise stated, Anfi and/or its licensors own the intellectual property rights for all 
              material on Anfi. All intellectual property rights are reserved.
            </p>
            <p className="text-gray-600">
              You may view and/or print pages from https://anfi.com for your own personal use subject to 
              restrictions set in these terms and conditions.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">3. User Responsibilities</h2>
            <p className="text-gray-600 mb-4">
              You warrant and represent that:
            </p>
            <ul className="list-disc pl-6 text-gray-600 mb-4">
              <li>You are entitled to post the Content on our service and have all necessary licenses and consents to do so;</li>
              <li>The Content does not violate the rights of any third party, including but not limited to intellectual property rights;</li>
              <li>The Content does not contain any defamatory, libelous, offensive, indecent or otherwise unlawful material which is an invasion of privacy.</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Limitations of Liability</h2>
            <p className="text-gray-600">
              In no event shall Anfi, nor its directors, employees, partners, agents, suppliers, or affiliates, 
              be liable for any indirect, incidental, special, consequential or punitive damages, including 
              without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting 
              from your access to or use of or inability to access or use the service.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">5. Changes to Terms</h2>
            <p className="text-gray-600">
              We reserve the right, at our sole discretion, to modify or replace these terms at any time. 
              By continuing to access or use our service after any revisions become effective, you agree to 
              be bound by the revised terms.
            </p>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Terms;