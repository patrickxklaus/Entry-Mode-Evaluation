import supabase from "../config/supabaseClient"
import { useEffect, useState } from "react"
const Home = () => {
  const [fetchError, setFetchError] = useState(null)
  const[directExportData, setDirectExportData] = useState(null)

  useEffect(() => {
    const fetchDirectExportData = async () => {
      const { data, error } = await supabase
        .from('Direct Export')
        .select('*')
      if (error) {
        setFetchError("Could not fetch the data")
        setDirectExportData(null)
        console.log(error)
      } else {
        setDirectExportData(data)
        setFetchError(null)
      }
    }
    fetchDirectExportData()
  }, [])

  return (
    <div className="page home">
      {fetchError && (<p>{fetchError}</p>)}
      {directExportData && (
        <ul>
          {directExportData.map(item => (
            <li key={item.id}>{item.created_at}</li>
          ))}
        </ul>
      )}
    </div> 
  )
}

export default Home
