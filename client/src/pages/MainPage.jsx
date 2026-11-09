import { Link } from 'react-router-dom';

function MainPage() {
    return (
        <div>
            <h1>Main page</h1>
            <Link to="/register"><button>Register</button></Link>
            <Link to="/login"><button>Log in</button></Link>
        </div>
    );
}

export default MainPage;