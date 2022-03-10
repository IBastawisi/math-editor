import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/Add";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import ArticleIcon from '@mui/icons-material/Article';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';

const NewDocument: React.FC<{}> = () => {
  const navigate = useNavigate();

  const newDocumentData = () => ({ time: new Date().getTime(), blocks: [{ type: "header", data: { text: "Untitled Document", level: 2 } }] });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const document = {
      id: uuidv4(),
      name: formData.get('fileName') as string,
      data: newDocumentData(),
    }
    window.localStorage.setItem(document.id, JSON.stringify(document));
    navigate(`/edit/${document.id}`);
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
          <ArticleIcon />
        </Avatar>
        <Typography component="h1" variant="h5">Create a new document</Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
          <TextField margin="normal" size="small" required fullWidth id="fileName" label="Document Name" name="fileName" autoComplete="fileName" autoFocus />
          <Button type="submit" fullWidth variant="contained" startIcon={<AddIcon />} sx={{ mt: 3, mb: 2 }}>Create</Button>
        </Box>
      </Box>
    </Container>
  );
}

export default NewDocument;