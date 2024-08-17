import mongoose from 'mongoose';

const fileSchema = new  mongoose.Schema({
    filename: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true },
    uuid: { type: String, required: true },  
}, { timestamps: true });

export default mongoose.model('File', fileSchema);
// 'files' will be added as a collection to db test