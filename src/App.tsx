import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { View1 } from './pages/View1';
import { View2 } from './pages/View2';
import { View3 } from './pages/View3';
import { FinalView } from './pages/FinalView';
import { NotAble } from './pages/NotAble';


function App() {

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<View1 />} />
        <Route path="/view2" element={<View2 />} />
        <Route path="/view3" element={<View3 />} />
        <Route path="/final" element={<FinalView />} />
        <Route path="/no" element={<NotAble />} />
      </Routes>
    </Layout>
  )

}

export default App
