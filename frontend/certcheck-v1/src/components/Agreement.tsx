import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import AuthenticatedLayout from './AuthenticatedLayout';
import axios from 'axios';
interface AgreementForm {
  fullName: string;
}

interface AgreementData {
  employer_name?: string;
  employer_address?: string;
  admin_email?: string;
  contractor_name?: string;
  contractor_address?: string;
  contractor_email?: string;
  dpo_email?: string;
  title?: string;
  description?: string;
  status?: string;
  ref_id?: string;
  [key: string]: any;
}

const AgreementPage: React.FC = () => {
  const [formData, setFormData] = useState<AgreementForm>({ fullName: '' }); 
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isRejected, setIsRejected] = useState<boolean>(false);
  const [agreementData, setAgreementData] = useState<AgreementData>({});
  
  const location = useLocation();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, fullName: e.target.value });
  };

  const handleAccept = async () => {
    if (formData.fullName.trim() === '') {
      alert('Please enter your full name to provide consent.');
      return;
    }
    
    try {
      console.log("ref id in agreementdata", agreementData.ref_id);
      const token = localStorage.getItem('auth_token');
      console.log("token in agreement page", token);
      const response = await axios.post(`/backend/agreement/accept`, {
        ref_id: agreementData.ref_id,
        // full_name: formData.fullName,
        // status: 'accepted'
      }
      , {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    setIsSubmitted(true);
    console.log('Consent accepted:', response.data);
    } catch (error) {
      console.error('Error accepting agreement:', error);
      alert('Failed to submit agreement. Please try again.');
    }
  };

  const handleReject = async () => {
    if (formData.fullName.trim() === '') {
      alert('Please enter your full name to provide consent.');
      return;
    }

    try {
      console.log("ref id in agreementdata", agreementData.ref_id);
      const token = localStorage.getItem('auth_token');
      console.log("token in agreement page", token);
      const response = await axios.post(`/backend/agreement/reject`, {
        ref_id: agreementData.ref_id,
        // status: 'rejected'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      setIsRejected(true);
      console.log('Consent rejected:', response.data);
    } catch (error) {
      console.error('Error rejecting agreement:', error);
      alert('Failed to reject agreement. Please try again.');
    }
  };

  useEffect(() => {
    if (location.state?.agreementData) {
      setAgreementData(location.state.agreementData);
    }
  }, [location]);

  return (
    <AuthenticatedLayout showDashboard={false}>
      <Card className="bg-card border-border shadow-2xl max-w-4xl mx-auto">
        <CardHeader className="border-b border-border">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-2xl font-bold text-foreground">
              Data Processing and Sharing Agreement
            </CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-8 p-8">
          <section className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              This Data Processing and Sharing Agreement ("Agreement") is entered into between:
            </p>
            <ul className="space-y-3 pl-4">
              <li className="text-foreground">
                <strong className="text-primary">Data Controller</strong>: {agreementData.contractor_name || 'CertCheck'}, a company registered at {agreementData.contractor_address || 'London, UK'}, with contact email {agreementData.contractor_email || 'ms@arqivus.ai'} ("Contractor").
              </li>
              <li className="text-foreground">
                <strong className="text-primary">Data Subject</strong>: The Employee, as identified below ("Employee").
              </li>
              <li className="text-foreground">
                <strong className="text-primary">Data Recipient</strong>: {agreementData.employer_name || '[Employer Name]'}, a company registered at {agreementData.employer_address || '[Employer Address]'}, with contact email {agreementData.admin_email || '[Employer Email]'} ("Employer").
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              This Agreement governs the processing and sharing of the Employee's personal data, including details from their Construction Skills Certification Scheme (CSCS) card, in compliance with Regulation (EU) 2016/679 (General Data Protection Regulation, "GDPR").
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">Purpose</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Contractor facilitates the sharing of the Employee's verified personal and CSCS card details with the Employer to assist the Employee in securing employment. This Agreement ensures that all data processing and sharing activities comply with GDPR requirements.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">Key Terms and Conditions</h2>
            <ol className="space-y-3 text-muted-foreground leading-relaxed">
              <li>
                <strong className="text-foreground">Lawful Basis for Processing</strong>: The Employee provides explicit consent for the Contractor to process and share their personal data, including CSCS card details, with the Employer for the purpose of job placement, as per Article 6(1)(a) GDPR.
              </li>
              <li>
                <strong className="text-foreground">Data Processed</strong>: The Contractor will process: Full name, address, date of birth, contact details, CSCS card number, type, expiry date, and qualifications.
              </li>
              <li>
                <strong className="text-foreground">Purpose of Processing</strong>: Data will be processed solely to verify qualifications and facilitate job placement.
              </li>
              <li>
                <strong className="text-foreground">Data Sharing</strong>: The Contractor will share the Employee's data with the Employer for employment consideration.
              </li>
              <li>
                <strong className="text-foreground">Consent for Data Sharing</strong>: The Employee consents to data sharing via this Agreement.
              </li>
              <li>
                <strong className="text-foreground">Data Storage</strong>: Data may be stored in a secure database and cloud for as long as necessary, unless consent is withdrawn.
              </li>
              <li>
                <strong className="text-foreground">Data Security</strong>: The Contractor will implement encryption, access controls, and security assessments (Article 32 GDPR).
              </li>
              <li>
                <strong className="text-foreground">Data Retention</strong>: Data will be deleted or returned upon consent withdrawal or service termination (Article 28(3)(g) GDPR).
              </li>
              <li>
                <strong className="text-foreground">Sub-Processors</strong>: Sub-processors (e.g., cloud providers) will comply with GDPR via written agreements (Article 28(4) GDPR).
              </li>
              <li>
                <strong className="text-foreground">Data Subject Rights</strong>: The Employee retains rights to access, rectify, erase, restrict processing, data portability, and object (Chapter III GDPR).
              </li>
              <li>
                <strong className="text-foreground">Data Breach Notification</strong>: Breaches will be reported within 72 hours (Article 33 GDPR).
              </li>
              <li>
                <strong className="text-foreground">Confidentiality</strong>: Personnel and sub-processors are bound by confidentiality (Article 28(3)(b) GDPR).
              </li>
              <li>
                <strong className="text-foreground">Audits and Inspections</strong>: The Contractor will allow audits to demonstrate GDPR compliance (Article 28(3)(h) GDPR).
              </li>
              <li>
                <strong className="text-foreground">International Data Transfers</strong>: Data transfers outside the EEA will use Standard Contractual Clauses (Article 46 GDPR).
              </li>
              <li>
                <strong className="text-foreground">Liability</strong>: The Contractor is liable for sub-processor non-compliance.
              </li>
              <li>
                <strong className="text-foreground">Withdrawal of Consent</strong>: Consent can be withdrawn at any time (Article 7(3) GDPR).
              </li>
              <li>
                <strong className="text-foreground">Data Protection Officer</strong>: Contactable at [DPO Email] (Article 37 GDPR, if applicable).
              </li>
              <li>
                <strong className="text-foreground">Records of Processing</strong>: Records will be maintained and available (Article 30 GDPR).
              </li>
              <li>
                <strong className="text-foreground">Termination of Agreement</strong>: Terminates upon data processing cessation or consent withdrawal.
              </li>
              <li>
                <strong className="text-foreground">Governing Law</strong>: Governed by [Your Country/EEA Member State] laws, per GDPR.
              </li>
            </ol>
          </section>

          <section className="space-y-4 bg-muted/30 p-6 rounded-lg border border-border">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">Employee Consent</h2>
            {agreementData.status === 'Pending' ? (
              isSubmitted ? (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-md">
                  <p className="text-green-600 font-semibold">
                    Thank you, {formData.fullName}, for providing your consent. Your data will be processed as per this Agreement.
                  </p>
                </div>
              ) : isRejected ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                  <p className="text-red-600 font-semibold">
                    You have rejected the agreement. Your data will not be processed or shared.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    I confirm that I have read and understood this Agreement. I provide my explicit consent for {agreementData.contractor_name || 'CertCheck'} to process and share my personal data, including CSCS card details, with {agreementData.employer_name || '[Employer Name]'} for the purpose of job placement. I understand my rights under GDPR and that I may withdraw consent at any time.
                  </p>
                  <div className="space-y-2">
                    <label htmlFor="fullName" className="block text-foreground font-medium">
                      Full Name (to confirm consent)
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="flex space-x-4 pt-4">
                    <Button
                      onClick={handleAccept}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-2"
                    >
                      Accept Agreement
                    </Button>
                    <Button
                      onClick={handleReject}
                      variant="destructive"
                      className="px-8 py-2"
                    >
                      Reject Agreement
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <div className="p-4 bg-muted border border-border rounded-md">
                <p className="text-foreground font-semibold mb-2">
                  Status: {agreementData.status === 'accepted' ? 'Accepted' : agreementData.status === 'rejected' ? 'Rejected' : 'Completed'}
                </p>
                <p className="text-muted-foreground">
                  You have already {agreementData.status === 'Accepted' ? 'Accepted' : 'Rejected'} this agreement and cannot submit again. 
                  If you need to make changes, please contact the admin to resend a new agreement.
                </p>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-foreground border-b border-border pb-2">Contact Information</h2>
            <div className="text-muted-foreground leading-relaxed space-y-2">
              <p><strong className="text-foreground">Contractor</strong>: {agreementData.contractor_name || 'CertCheck'}, {agreementData.contractor_address || 'London, UK'}, {agreementData.contractor_email || 'ms@arqivus.ai'}</p>
              <p><strong className="text-foreground">Data Protection Officer</strong>: {agreementData.dpo_email || '[DPO Email]'}</p>
              <p><strong className="text-foreground">Employee</strong>: As provided above</p>
            </div>
          </section>
        </CardContent>
      </Card>
    </AuthenticatedLayout>
  );
};

export default AgreementPage;