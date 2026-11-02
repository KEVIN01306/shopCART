import { Box, Container } from '@mui/material';
import { Outlet } from 'react-router-dom';

/**
 * BlankLayout — used for public/unauthenticated pages such as login and registration.
 * Provides a clean, centered container with no navigation chrome.
 */
const BlankLayout = () => {
    return (
        <Box
            component="main"
            sx={{
                minHeight: '100vh',
                backgroundColor: 'background.default',
                backgroundImage: `url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22250%22%20height%3D%22250%22%20viewBox%3D%220%200%20250%20250%22%3E%3Cg%20transform%3D%22rotate(-13%20125%20125)%22%20opacity%3D%220.19%22%3E%3Cg%20transform%3D%22translate(32.5%2C%2052.5)%22%3E%3Ctext%20x%3D%2230%22%20y%3D%2210%22%20font-family%3D%22%27Space%20Mono%27%2C%20monospace%22%20font-size%3D%2215%22%20font-weight%3D%22bold%22%20fill%3D%22%23FD9636%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3EshopCART%3C%2Ftext%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(175%2C%2050)%22%3E%3Cg%20transform%3D%22scale(0.85)%22%3E%3Crect%20x%3D%222%22%20y%3D%221%22%20width%3D%2220%22%20height%3D%2234%22%20rx%3D%223%22%20fill%3D%22none%22%20stroke%3D%22%23FD9636%22%20stroke-width%3D%222%22%2F%3E%3Crect%20x%3D%224%22%20y%3D%223%22%20width%3D%2216%22%20height%3D%2210%22%20rx%3D%221.5%22%20fill%3D%22none%22%20stroke%3D%22%23FD9636%22%20stroke-width%3D%221.5%22%2F%3E%3Cline%20x1%3D%226%22%20y1%3D%226%22%20x2%3D%2218%22%20y2%3D%226%22%20stroke%3D%22%23FD9636%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%2F%3E%3Cline%20x1%3D%226%22%20y1%3D%229%22%20x2%3D%2213%22%20y2%3D%229%22%20stroke%3D%22%23FD9636%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%2F%3E%3Ccircle%20cx%3D%226%22%20cy%3D%2218%22%20r%3D%221%22%20fill%3D%22%23FD9636%22%2F%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2218%22%20r%3D%221%22%20fill%3D%22%23FD9636%22%2F%3E%3Ccircle%20cx%3D%2218%22%20cy%3D%2218%22%20r%3D%221%22%20fill%3D%22%23FD9636%22%2F%3E%3Ccircle%20cx%3D%226%22%20cy%3D%2223%22%20r%3D%221%22%20fill%3D%22%23FD9636%22%2F%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2223%22%20r%3D%221%22%20fill%3D%22%23FD9636%22%2F%3E%3Ccircle%20cx%3D%2218%22%20cy%3D%2223%22%20r%3D%221%22%20fill%3D%22%23FD9636%22%2F%3E%3Ccircle%20cx%3D%226%22%20cy%3D%2228%22%20r%3D%221%22%20fill%3D%22%23FD9636%22%2F%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2228%22%20r%3D%221%22%20fill%3D%22%23FD9636%22%2F%3E%3Crect%20x%3D%2216%22%20y%3D%2227%22%20width%3D%224%22%20height%3D%223%22%20rx%3D%220.5%22%20fill%3D%22%23FD9636%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(47.5%2C%20172.5)%22%3E%3Cg%20transform%3D%22scale(0.89)%22%3E%3Ccircle%20cx%3D%226%22%20cy%3D%2224%22%20r%3D%225%22%20fill%3D%22none%22%20stroke%3D%22%23FD9636%22%20stroke-width%3D%222%22%2F%3E%3Ccircle%20cx%3D%2226%22%20cy%3D%2224%22%20r%3D%225%22%20fill%3D%22none%22%20stroke%3D%22%23FD9636%22%20stroke-width%3D%222%22%2F%3E%3Cpath%20d%3D%22M6%2C24%20L12%2C14%20L24%2C14%20L26%2C24%22%20fill%3D%22none%22%20stroke%3D%22%23FD9636%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3Cpath%20d%3D%22M12%2C14%20L11%2C5%20L7%2C5%22%20fill%3D%22none%22%20stroke%3D%22%23FD9636%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%2F%3E%3Crect%20x%3D%2217%22%20y%3D%225%22%20width%3D%2210%22%20height%3D%229%22%20rx%3D%221.5%22%20fill%3D%22none%22%20stroke%3D%22%23FD9636%22%20stroke-width%3D%222%22%2F%3E%3Cline%20x1%3D%2212%22%20y1%3D%2220%22%20x2%3D%2220%22%20y2%3D%2220%22%20stroke%3D%22%23FD9636%22%20stroke-width%3D%221.5%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3Cg%20transform%3D%22translate(172.5%2C%20172.5)%22%3E%3Cg%20transform%3D%22scale(0.89)%22%3E%3Ccircle%20cx%3D%2213%22%20cy%3D%228%22%20r%3D%225%22%20fill%3D%22none%22%20stroke%3D%22%23FD9636%22%20stroke-width%3D%222%22%2F%3E%3Cpath%20d%3D%22M3%2C28%20C3%2C20%208%2C16%2013%2C16%20C16%2C16%2020%2C18%2022%2C22%22%20fill%3D%22none%22%20stroke%3D%22%23FD9636%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%2F%3E%3Crect%20x%3D%2219%22%20y%3D%2214%22%20width%3D%2211%22%20height%3D%2215%22%20rx%3D%221%22%20fill%3D%22none%22%20stroke%3D%22%23FD9636%22%20stroke-width%3D%221.5%22%2F%3E%3Crect%20x%3D%2223%22%20y%3D%2212%22%20width%3D%223%22%20height%3D%222%22%20rx%3D%220.5%22%20fill%3D%22%23FD9636%22%2F%3E%3Cpath%20d%3D%22M22%2C20%20L24%2C22%20L28%2C18%22%20fill%3D%22none%22%20stroke%3D%22%23FD9636%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3Cline%20x1%3D%2222%22%20y1%3D%2225%22%20x2%3D%2227%22%20y2%3D%2225%22%20stroke%3D%22%23FD9636%22%20stroke-width%3D%221%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E")`, display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Container maxWidth="lg" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Outlet />
            </Container>
        </Box>
    );
};

export default BlankLayout;
