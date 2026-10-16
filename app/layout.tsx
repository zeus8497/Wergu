import type { Metadata } from "next";
export const metadata:Metadata={title:"Wergu",description:"Votre espace personnel de santé, sport et finances"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body style={{margin:0,fontFamily:"system-ui,Arial",background:"#0b1220",color:"#eef4ff"}}>{children}</body></html>}