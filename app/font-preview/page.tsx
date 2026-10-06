import { notFound } from 'next/navigation';
import Home from '../page';
import styles from './preview.module.css';

export const metadata = { title: 'Designforhåndsvisning', robots: { index: false } };

// Design preview for local development only; production returns 404.
export default function FontPreview(){
 if (process.env.NODE_ENV === 'production') notFound();
 return <div>
  <div className={styles.banner}><span><strong>Steam / Studio preview</strong> · Supreme</span><a href="/" target="_blank" rel="noopener noreferrer">Compare with current site ↗</a></div>
  <Home slideBooking/>
 </div>;
}
