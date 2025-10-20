import { useNavigation } from './context/NavigationContext';
import { Layout } from './components/Layout';
import { View1 } from './pages/View1';
import { View2 } from './pages/View2';
import { View3 } from './pages/View3';
import { FinalView } from './pages/FinalView';
import { NotAble } from './pages/NotAble';
import { ViewContainer } from './components/ViewContainer';


function App() {
  const { currentView } = useNavigation();

  return (
    <Layout>
      <ViewContainer currentView={currentView} expectedView="view1">
        <View1 />
      </ViewContainer>
      <ViewContainer currentView={currentView} expectedView="view2">
        <View2 />
      </ViewContainer>
      <ViewContainer currentView={currentView} expectedView="view3">
        <View3 />
      </ViewContainer>
      <ViewContainer currentView={currentView} expectedView="final">
        <FinalView />
      </ViewContainer>
      <ViewContainer currentView={currentView} expectedView="no">
        <NotAble />
      </ViewContainer>
    </Layout>
  )

}

export default App
