import Nano, {type Configuration} from 'nano'

const url: string | Configuration = `${process.env.COUCH_SCHEME}://${process.env.COUCH_LOGIN}:${process.env.COUCH_PASSWORD}@${process.env.COUCH_SERVER}:${process.env.COUCH_PORT}`

const nanoDB: Nano.ServerScope = Nano(url) as Nano.ServerScope

export default nanoDB