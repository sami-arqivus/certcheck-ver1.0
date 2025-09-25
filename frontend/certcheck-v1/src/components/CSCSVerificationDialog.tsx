
// import React, { useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Award } from 'lucide-react';
// import { useAuth } from './AuthContext';
// import { useToast } from '@/hooks/use-toast';

// const CSCSVerificationDialog = () => {
//   const { user } = useAuth();
//   const { toast } = useToast();
//   const [isCSCSDialogOpen, setIsCSCSDialogOpen] = useState(false);
//   const [schemeType, setSchemeType] = useState('');
//   const [registrationNumber, setRegistrationNumber] = useState('');
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   const handleCSCSSubmit = async () => {
//     if (!schemeType || !registrationNumber) {
//       toast({
//         title: "Error",
//         description: "Please fill in all required fields.",
//         variant: "destructive",
//       });
//       return;
//     }

//     setIsSubmitting(true);
    
//     try {
//       // Use last_name property from the User interface
//       const lastName = user?.last_name || '';
      
//       const response = await fetch('http://localhost:8003/cscs-check', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           scheme_type: schemeType,
//           registration_number: registrationNumber,
//           last_name: lastName,
//         }),
//       });

//       if (response.ok) {
//         const data = await response.json();
//         toast({
//           title: "CSCS Verification Submitted",
//           description: "Your CSCS verification request has been processed successfully.",
//         });
//         setIsCSCSDialogOpen(false);
//         setSchemeType('');
//         setRegistrationNumber('');
//       } else {
//         throw new Error('Failed to submit CSCS verification');
//       }
//     } catch (error) {
//       console.error('CSCS verification error:', error);
//       toast({
//         title: "Error",
//         description: "Failed to submit CSCS verification. Please try again.",
//         variant: "destructive",
//       });
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <Dialog open={isCSCSDialogOpen} onOpenChange={setIsCSCSDialogOpen}>
//       <DialogTrigger asChild>
//         <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl">
//           <Award className="w-5 h-5 mr-2" />
//           Get CSCS Verified
//         </Button>
//       </DialogTrigger>
//       <DialogContent className="bg-gray-900 text-white border-gray-700">
//         <DialogHeader>
//           <DialogTitle className="text-xl font-bold text-center">
//             CSCS Verification
//           </DialogTitle>
//         </DialogHeader>
//         <div className="space-y-4">
//           <div>
//             <Label htmlFor="schemeType" className="text-white">
//               CSCS Scheme Type
//             </Label>
//             <Input
//               id="schemeType"
//               value={schemeType}
//               onChange={(e) => setSchemeType(e.target.value)}
//               placeholder="e.g., Green Card, Gold Card"
//               className="bg-gray-800 border-gray-600 text-white"
//             />
//           </div>
//           <div>
//             <Label htmlFor="registrationNumber" className="text-white">
//               CSCS Registration Number
//             </Label>
//             <Input
//               id="registrationNumber"
//               value={registrationNumber}
//               onChange={(e) => setRegistrationNumber(e.target.value)}
//               placeholder="Enter your CSCS registration number"
//               className="bg-gray-800 border-gray-600 text-white"
//             />
//           </div>
//           <Button
//             onClick={handleCSCSSubmit}
//             disabled={isSubmitting}
//             className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
//           >
//             {isSubmitting ? 'Submitting...' : 'Submit CSCS Verification'}
//           </Button>
//         </div>
//       </DialogContent>
//     </Dialog>
//   );
// };

// export default CSCSVerificationDialog;





import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Award } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api';

const CSCSVerificationDialog = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCSCSDialogOpen, setIsCSCSDialogOpen] = useState(false);
  const [schemeType, setSchemeType] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCSCSSubmit = async () => {
    if (!schemeType || !registrationNumber) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Use last_name property from the User interface
      const lastName = user?.last_name || '';
      console.log('lastName:', lastName);
      // Send request using API client
      const response = await apiClient.post('/cscs-check', {
        cscs_scheme: schemeType,
        registration_number: registrationNumber,
        last_name: lastName,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      toast({
        title: "CSCS Verification Submitted",
        description: "Your CSCS verification request has been processed successfully.",
      });
      setIsCSCSDialogOpen(false);
      setSchemeType('');
      setRegistrationNumber('');
    } catch (error: any) {
      console.error('CSCS verification error:', error);
      let errorMessage = 'Failed to submit CSCS verification. Please try again.';
      

      if (error.response) {
        errorMessage = error.response.data.detail || error.response.data.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'Failed to connect to the server. Please check your network.';
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isCSCSDialogOpen} onOpenChange={setIsCSCSDialogOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-xl">
          <Award className="w-5 h-5 mr-2" />
          Get CSCS Verified
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            CSCS Verification
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="schemeType" className="text-white">
              CSCS Scheme Type
            </Label>
            <Input
              id="schemeType"
              value={schemeType}
              onChange={(e) => setSchemeType(e.target.value)}
              placeholder="e.g., Green Card, Gold Card"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>
          <div>
            <Label htmlFor="registrationNumber" className="text-white">
              CSCS Registration Number
            </Label>
            <Input
              id="registrationNumber"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="Enter your CSCS registration number"
              className="bg-gray-800 border-gray-600 text-white"
            />
          </div>
          <Button
            onClick={handleCSCSSubmit}
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {isSubmitting ? 'Submitting...' : 'Submit CSCS Verification'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CSCSVerificationDialog;