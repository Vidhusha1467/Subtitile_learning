const mongoose = require('mongoose');
const dns = require('dns');
const dnsPromises = dns.promises;

// Prefer IPv4 resolution to avoid transient querySrv ECONNREFUSED issues on some systems
if (typeof dns.setDefaultResultOrder === 'function') {
    try { dns.setDefaultResultOrder('ipv4first'); } catch (e) { /* ignore */ }
}
// Force known public DNS servers (helps when local resolver blocks SRV queries)
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
    // ignore if not available
}

const connectDB = async () => {
    const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoURI) {
        throw new Error('MONGO_URI environment variable is not set');
    }

    // If already connected, return the existing connection
    if (mongoose.connection && mongoose.connection.readyState === 1) {
        console.log('✅ MongoDB already connected');
        return mongoose.connection;
    }

    try {
        const conn = await mongoose.connect(mongoURI, { family: 4 });
        console.log(`✅ Connected to MongoDB: ${conn.connection.host}`);
        return conn.connection;
    } catch (error) {
        console.error('MongoDB connection failed:', error.message || error);

        // If the error was a SRV/DNS query refusal, try building a direct (non-SRV) URI
        if (error && (error.syscall === 'querySrv' || (error.code && (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')))) {
            try {
                // Parse original mongoURI for credentials and database
                // Expect formats like: mongodb+srv://user:pass@cluster.domain/dbname?opts
                const match = mongoURI.match(/^mongodb\+srv:\/\/(?:([^:]+):([^@]+)@)?([^/\?]+)\/?([^\?]*)\??(.*)$/);
                if (!match) throw new Error('Unable to parse MONGO_URI for SRV fallback');
                const [, user, pass, clusterHost, dbName, qs] = match;

                // Resolve SRV targets
                const srvName = `_mongodb._tcp.${clusterHost}`;
                const srvRecords = await dnsPromises.resolveSrv(srvName);
                const hosts = srvRecords.map(r => `${r.name}:27017`).join(',');

                // Read TXT options (replicaSet, authSource, etc.)
                let txtOpts = '';
                try {
                    const txt = await dnsPromises.resolveTxt(clusterHost);
                    if (Array.isArray(txt) && txt.length > 0) {
                        // txt is array of arrays of strings
                        txtOpts = txt.map(t => t.join('')).join('&');
                    }
                } catch (txtErr) {
                    // ignore
                }

                // Build fallback options, include any original querystring
                const baseOpts = [txtOpts, qs].filter(Boolean).join('&');
                const opts = (baseOpts ? baseOpts + '&' : '') + 'ssl=true&retryWrites=true&w=majority';

                const credentials = user ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';
                const dbpart = dbName ? `/${dbName}` : '';
                const directUri = `mongodb://${credentials}${hosts}${dbpart}?${opts}`;

                console.log('Attempting direct MongoDB URI (no SRV)');
                const conn2 = await mongoose.connect(directUri, { family: 4 });
                console.log(`✅ Connected to MongoDB (direct): ${conn2.connection.host}`);
                return conn2.connection;
            } catch (fallbackErr) {
                console.error('Fallback direct MongoDB connection failed:', fallbackErr.message || fallbackErr);
                throw fallbackErr;
            }
        }

        throw error;
    }
};

module.exports = connectDB;