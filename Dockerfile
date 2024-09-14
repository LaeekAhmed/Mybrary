FROM node
# setting working dir
WORKDIR /NoteSpot
# to get env ready
COPY package*.json ./
# get deps
RUN pnpm install
# cp source code to working dir
COPY . .

ENV PORT 2000
EXPOSE 2000
CMD ["pnpm", "start"]   