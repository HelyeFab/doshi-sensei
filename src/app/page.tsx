import ClientHome from '@/components/ClientHome';

export default function Home() {
  // Calculate initial values on the server
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  const initialDate = today.toLocaleDateString('en-US', options);
  
  // Calculate day progress
  const hours = today.getHours();
  const minutes = today.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  const initialProgress = (totalMinutes / (24 * 60)) * 100;

  return <ClientHome initialDate={initialDate} initialProgress={initialProgress} />;
}